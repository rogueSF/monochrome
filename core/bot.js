'use strict'
const reload = require('require-reload')(require);
const Eris = require('eris');
const request = require('request-promise');
const Logger = require('./logger.js');
const Persistence = require('./persistence.js');
const NavigationManager = require('./navigation_manager.js');
const replyDeleter = require('./reply_deleter.js');
const constants = require('./constants.js');
const Blacklist = require('./blacklist.js');
const MessageProcessorManager = require('./message_processor_manager.js');
const Settings = require('./settings.js');
const CommandManager = require('./command_manager.js');
const assert = require('assert');

const LOGGER_TITLE = 'CORE';
const UPDATE_STATS_INTERVAL_IN_MS = 7200000; // 2 hours
const UPDATE_STATS_INITIAL_DELAY_IN_MS = 60000; // 1 minute
const USER_MENTION_REPLACE_REGEX = /<@user>/g;
const USER_NAME_REPLACE_REGEX = /<user>/g;

function updateStatusFromQueue(bot, queue) {
  let nextStatus = queue.shift();
  bot.editStatus({name: nextStatus});
  queue.push(nextStatus);
}

function updateDiscordBotsDotOrg(config, bot, logger) {
  if (!config.discordBotsDotOrgAPIKey) {
    return;
  }
  request({
    headers: {
      'Content-Type': 'application/json',
      'Authorization': config.discordBotsDotOrgAPIKey,
      'Accept': 'application/json',
    },
    uri: `https://discordbots.org/api/bots/${bot.user.id}/stats`,
    body: `{"server_count": ${bot.guilds.size.toString()}}`,
    method: 'POST',
  }).then(() => {
    logger.logSuccess(LOGGER_TITLE, `Sent stats to discordbots.org: ${bot.guilds.size.toString()} servers.`);
  }).catch(err => {
    logger.logFailure(LOGGER_TITLE, 'Error sending stats to discordbots.org', err);
  });
}

function updateBotsDotDiscordDotPw(config, bot, logger) {
  if (!config.botsDotDiscordDotPwAPIKey) {
    return;
  }
  request({
    headers: {
      'Content-Type': 'application/json',
      'Authorization': config.botsDotDiscordDotPwAPIKey,
      'Accept': 'application/json',
    },
    uri: `https://bots.discord.pw/api/bots/${bot.user.id}/stats`,
    body: `{"server_count": ${bot.guilds.size.toString()}}`,
    method: 'POST',
  }).then(() => {
    logger.logSuccess(LOGGER_TITLE, `Sent stats to bots.discord.pw: ${bot.guilds.size.toString()} servers.`);
  }).catch(err => {
    logger.logFailure(LOGGER_TITLE, 'Error sending stats to bots.discord.pw', err);
  });
}

function updateStats(config, bot, logger) {
  updateBotsDotDiscordDotPw(config, bot, logger);
  updateDiscordBotsDotOrg(config, bot, logger);
}

function createGuildLeaveJoinLogString(guild, logger) {
  try {
    let owner = guild.members.get(guild.ownerID).user;
    return `${guild.name} owned by ${owner.username}#${owner.discriminator}`;
  } catch (err) {
    // Sometimes this happens because the owner isn't cached or something.
    logger.logFailure(LOGGER_TITLE, 'Couldn\'t create join/leave guild log string', err);
    return '<Error getting guild name or owner name>';
  }
}

function stringContainsInviteLink(str) {
  return str.indexOf('discord.gg') !== -1;
}

function validateAndSanitizeOptions(options) {
  if (!options || typeof options !== 'object') {
    throw new Error('Either nothing was passed to the Monochrome bot constructor, or something was but it\'s not an object. The interface changed since version 1.1. Please review the readme.');
  }

  if (!options.botToken) {
    throw new Error('No botToken specified');
  }

  if (options.statusRotation) {
    if (!Array.isArray(options.statusRotation)) {
      throw new Error('If provided, statusRotation must be an array');
    }
    if (!options.statusRotationIntervalInSeconds && options.statusRotation.length > 1) {
      throw new Error('If statusRotation is provided and has more than one status, statusRotationIntervalInSeconds must also be provided');
    }
  } else {
    options.statusRotation = [];
  }

  if (options.botAdminIds && !Array.isArray(options.botAdminIds)) {
    options.botAdminIds = [options.botAdminIds];
  }
  if (!options.botAdminIds) {
    options.botAdminIds = [];
  }

  if (options.prefixes && !Array.isArray(options.prefixes)) {
    options.prefixes = [options.prefixes];
  }
  if (!options.prefixes || !options.prefixes[0]) {
    options.prefixes = [''];
  }

  if (typeof options.useANSIColorsInLogFiles !== 'boolean') {
    options.useANSIColorsInLogFiles = true;
  }

  if (options.ignoreOtherBots === undefined) {
    options.ignoreOtherBots = true;
  }

  return options;
}

class Monochrome {
  constructor(options) {
    this.options_ = validateAndSanitizeOptions(options, this.logger_);

    this.bot_ = new Eris(this.options_.botToken, this.options_.erisOptions);
    this.logger_ = new Logger(this.options_.logDirectoryPath, this.options_.useANSIColorsInLogFiles);
    this.persistence_ = new Persistence(this.options_.prefixes, this.logger_);
    this.blacklist_ = new Blacklist(this.bot_, this.persistence_, this.options_.botAdminIds);
    replyDeleter.initialize(Eris);
    this.navigationManager_ = new NavigationManager(this.logger_);

    this.reload();
  }

  getErisBot() {
    return this.bot_;
  }

  getLogger() {
    return this.logger_;
  }

  getNavigationManager() {
    return this.navigationManager_;
  }

  getPersistence() {
    return this.persistence_;
  }

  getBlacklist() {
    return this.blacklist_;
  }

  getSettings() {
    assert(this.settings_, 'Settings not available (probably a bug in monochrome)');
    return this.settings_;
  }

  getSettingsIconUri() {
    return this.options_.settingsIconUri;
  }

  getBotAdminIds() {
    return this.options_.botAdminIds;
  }

  getGenericErrorMessage() {
    return this.options_.genericErrorMessage;
  }

  getMissingPermissionsErrorMessage() {
    return this.options_.missingPermissionsErrorMessage;
  }

  getCommandManager() {
    assert(this.commandManager_, 'Command manager not available (probably a bug in monochrome)');
    return this.commandManager_;
  }

  reload() {
    this.settings_ = new Settings(this.persistence_, this.logger_, this.options_.settingsFilePath);
    this.commandManager_ = new CommandManager(this.options_.commandsDirectoryPath, this.options_.prefixes, this);
    this.commandManager_.load();
    this.messageProcessorManager_ = new MessageProcessorManager(this.options_.messageProcessorsDirectoryPath, this);
    this.messageProcessorManager_.load();
  }

  userIsServerAdmin(msg) {
    if (!msg.channel.guild) {
      return true;
    }

    if (!msg.member) {
      return false;
    }

    let permission = msg.member.permission.json;
    if (permission.manageGuild || permission.administrator || permission.manageChannels) {
      return true;
    }

    if (this.options_.botAdminIds.indexOf(msg.author.id) !== -1) {
      return true;
    }

    return false;
  }

  connect() {
    if (this.connected_) {
      return;
    }

    this.connected_ = true;
    this.bot_.on('ready', () => {
      this.logger_.logSuccess(LOGGER_TITLE, 'Bot ready.');
      this.rotateStatuses_();
      this.startUpdateStatsInterval_();
    });

    this.bot_.on('messageCreate', msg => {
      this.onMessageCreate_(msg);
    });

    this.bot_.on('guildCreate', guild => {
      this.logger_.logSuccess('JOINED GUILD', createGuildLeaveJoinLogString(guild, this.logger_));
      this.blacklist_.leaveGuildIfBlacklisted(this.bot_, guild);
    });

    this.bot_.on('error', (err, shardId) => {
      let errorMessage = 'Error';
      if (shardId) {
        errorMessage += ` on shard ${shardId}`;
      }
      this.logger_.logFailure(LOGGER_TITLE, errorMessage, err);
    });

    this.bot_.on('disconnect', () => {
      this.logger_.logFailure(LOGGER_TITLE, 'All shards disconnected');
    });

    this.bot_.on('shardDisconnect', (err, id) => {
      this.logger_.logFailure(LOGGER_TITLE, `Shard ${id} disconnected`, err);
    });

    this.bot_.on('shardResume', id => {
      this.logger_.logSuccess(LOGGER_TITLE, `Shard ${id} reconnected`);
    });

    this.bot_.on('warn', message => {
      this.logger_.logFailure(LOGGER_TITLE, `Warning: ${message}`);
    });

    this.bot_.on('shardReady', id => {
      this.logger_.logSuccess(LOGGER_TITLE, `Shard ${id} connected`);
    });

    this.bot_.on('messageReactionAdd', (msg, emoji, userId) => {
      this.navigationManager_.handleEmojiToggled(this.bot_, msg, emoji, userId);
      replyDeleter.handleReaction(msg, userId, emoji);
    });

    this.bot_.on('messageDelete', msg => {
      replyDeleter.handleMessageDeleted(msg);
    });

    this.bot_.on('messageReactionRemove', (msg, emoji, userId) => {
      this.navigationManager_.handleEmojiToggled(this.bot_, msg, emoji, userId);
    });

    this.bot_.on('guildDelete', (guild, unavailable) => {
      if (!unavailable) {
        this.logger_.logFailure('LEFT GUILD', createGuildLeaveJoinLogString(guild, this.logger_));
      }
      this.persistence_.resetPrefixesForServerId(guild.id).then(() => {
        this.logger_.logSuccess('RESET PREFIXES', `for ${guild.name}`);
      }).catch(err => {
        this.logger_.logFailure('RESET PREFIXES', `for ${guild.name}`, err);
      });
    });

    this.bot_.connect().catch(err => {
      this.logger_.logFailure(LOGGER_TITLE, 'Error logging in', err);
    });
  }

  onMessageCreate_(msg) {
    try {
      if (msg.author.bot && this.options_.ignoreOtherBots) {
        return;
      }
      if (this.blacklist_.isUserBlacklistedQuick(msg.author.id)) {
        return;
      }
      if (this.commandManager_.processInput(this.bot_, msg)) {
        return;
      }
      if (this.messageProcessorManager_.processInput(this.bot_, msg)) {
        return;
      }
      if (this.tryHandleDm_(msg)) {
        return;
      }
      if (this.tryHandleMention_(msg)) {
        return;
      }
    } catch (err) {
      this.logger_.logFailure(LOGGER_TITLE, 'Error caught at top level (probably a bug in monochrome)', err);
      if (this.options_.genericErrorMessage) {
        msg.channel.createMessage(this.options_.genericErrorMessage).catch(err => {
          this.logger_.logFailure(LOGGER_TITLE, 'Error sending error message', err);
        });
      }
    }
  }

  startUpdateStatsInterval_() {
    if (this.updateStatsTimeoutHandle_) {
      return;
    }
    if (this.options_.discordBotsDotOrgAPIKey || this.options_.botsDotDiscordDotPwAPIKey) {
      this.updateStatsTimeoutHandle_ = setTimeout(() => {
        updateStats(this.options_, this.bot_, this.logger_);
        this.updateStatsTimeoutHandle_ = setInterval(updateStats, UPDATE_STATS_INTERVAL_IN_MS, this.options_, this.bot_, this.logger_);
      }, UPDATE_STATS_INITIAL_DELAY_IN_MS);
    }
  }

  rotateStatuses_() {
    let statusRotation = this.options_.statusRotation;
    if (statusRotation.length === 0) {
      return;
    }

    updateStatusFromQueue(this.bot_, statusRotation);

    if (statusRotation.length > 1) {
      let intervalInMs = this.options_.statusRotationIntervalInSeconds * 1000;
      setInterval(() => {
        try {
          updateStatusFromQueue(this.bot_, statusRotation);
        } catch (err) {
          this.logger_.logFailure(LOGGER_TITLE, 'Error rotating statuses', err);
        }
      }, intervalInMs);
    }
  }

  sendDmOrMentionReply_(toMsg, replyTemplate) {
    return toMsg.channel.createMessage(this.createDMOrMentionReply_(replyTemplate, toMsg)).catch(err => {
      this.logger_.logFailure(LOGGER_TITLE, 'Error sending reply to DM or message', err);
    });
  }

  tryHandleDm_(msg) {
    try {
      if (!msg.channel.guild) {
        this.logger_.logInputReaction('DIRECT MESSAGE', msg, '', true);
        if (this.options_.inviteLinkDmReply && stringContainsInviteLink(msg.content)) {
          this.sendDmOrMentionReply_(msg, this.options_.inviteLinkDmReply);
        } else if (this.options_.genericDMReply) {
          this.sendDmOrMentionReply_(msg, this.options_.genericDMReply);
        }
        return true;
      }
    } catch (err) {
      this.logger_.logFailure(LOGGER_TITLE, 'Error handling DM', err);
    }

    return false;
  }

  tryHandleMention_(msg) {
    if (!this.bot_.user) {
      return;
    }

    try {
      if (msg.mentions.length > 0 && msg.content.indexOf(this.bot_.user.mention) === 0 && this.options_.genericMentionReply) {
        this.sendDmOrMentionReply_(msg, this.options_.genericMentionReply);
        this.logger_.logInputReaction('MENTION', msg, '', true);
        return true;
      }
    } catch (err) {
      this.logger_.logFailure(LOGGER_TITLE, 'Error handling mention', err);
    }

    return false;
  }

  createDMOrMentionReply_(configReply, msg) {
    try {
      let reply = configReply.replace(USER_MENTION_REPLACE_REGEX, msg.author.mention);
      reply = reply.replace(USER_NAME_REPLACE_REGEX, msg.author.username);
      const prefix = this.persistence_.getPrimaryPrefixFromMsg(msg);
      reply = reply.replace(constants.PREFIX_REPLACE_REGEX, prefix);
      return reply;
    } catch (err) {
      this.logger_.logFailure(LOGGER_TITLE, 'Couldn\'t create DM or mention reply', err);
      return this.options_.genericErrorMessage;
    }
  }
}

module.exports = Monochrome;
