const assert = require('assert');
const AbstractSettingsElement = require('./../core/abstract_setting_element.js');
const Setting = require('./../core/setting.js');

class MockSettingsElementMissingFunction extends AbstractSettingsElement {
  constructor() {
    super();
  }

  getChildForFullyQualifiedUserFacingName() {}
  getFullyQualifiedUserFacingName() {}
  getConfigurationInstructionsBotContent() {}
}

let validIntegerSetting = {
  'type': 'SETTING',
  'userFacingName': 'countdown_start',
  'description': 'This setting controls what number I\'ll count down from when you use the bot!countdown command.',
  'valueType': 'INTEGER',
  'defaultDatabaseFacingValue': 10,
  'allowedDatabaseFacingValues': 'Range(1, 10)',
};

let validFloatSetting = {
  'type': 'SETTING',
  'userFacingName': 'Fraction',
  'description': 'My favorite fraction',
  'valueType': 'FLOAT',
  'defaultDatabaseFacingValue': 10,
  'allowedDatabaseFacingValues': 'Range(1, 10)',
};

let validStringSetting = {
  'type': 'SETTNG',
  'userFacingName': 'name',
  'description': 'My name.',
  'valueType': 'STRING',
  'defaultDatabaseFacingValue': 'Tom',
};

let validBooleanSetting = {
  'type': 'SETTING',
  'userFacingName': 'act_dumb',
  'description': 'Whether I should act dumb or not.',
  'valueType': 'BOOLEAN',
  'defaultDatabaseFacingValue': true,
};

let invalidValueTypeSetting1 = {
  'type': 'SETTING',
  'userFacingName': 'act_dumb',
  'description': 'Whether I should act dumb or not.',
  'valueType': 'BOOLrgrEAN',
  'defaultDatabaseFacingValue': true,
};

let invalidValueTypeSetting2 = {
  'type': 'SETTING',
  'userFacingName': 'act_dumb',
  'description': 'Whether I should act dumb or not.',
  'defaultDatabaseFacingValue': true,
};

let invalidDescriptionSetting1 = {
  'type': 'SETTING',
  'userFacingName': 'act_dumb',
  'description': 5,
  'valueType': 'BOOLEAN',
  'defaultDatabaseFacingValue': true,
};

let invalidDescriptionSetting2 = {
  'type': 'SETTING',
  'userFacingName': 'act_dumb',
  'valueType': 'BOOLEAN',
  'defaultDatabaseFacingValue': true,
};

let invalidUserFacingName1 = {
  'type': 'SETTING',
  'description': 'description',
  'valueType': 'BOOLEAN',
  'defaultDatabaseFacingValue': true,
};

let invalidUserFacingName2 = {
  'type': 'SETTING',
  'userFacingName': 5,
  'description': 'description',
  'valueType': 'BOOLEAN',
  'defaultDatabaseFacingValue': true,
};

let invalidUserFacingName3 = {
  'type': 'SETTING',
  'userFacingName': 'name.name',
  'description': 'description',
  'valueType': 'BOOLEAN',
  'defaultDatabaseFacingValue': true,
};

let invalidDatabaseFacingName1 = {
  'type': 'SETTING',
  'userFacingName': 'act_dumb',
  'databaseFacingName': 5,
  'description': 'Whether I should act dumb or not.',
  'valueType': 'BOOLEAN',
  'defaultDatabaseFacingValue': true,
};

let invalidDatabaseFacingName2 = {
  'type': 'SETTING',
  'userFacingName': 'act_dumb',
  'databaseFacingName': 'lol.fe',
  'description': 'Whether I should act dumb or not.',
  'valueType': 'BOOLEAN',
  'defaultDatabaseFacingValue': true,
};

let invalidDatabaseFacingValue1 = {
  'type': 'SETTING',
  'userFacingName': 'name',
  'description': 'My name.',
  'valueType': 'STRING',
};

let invalidDatabaseFacingValues1 = {
  'type': 'SETTING',
  'userFacingName': 'name',
  'description': 'My name.',
  'valueType': 'STRING',
  'allowedDatabaseFacingValues': 5,
};

let invalidDatabaseFacingValues2 = {
  'type': 'SETTING',
  'userFacingName': 'name',
  'description': 'My name.',
  'valueType': 'STRING',
  'allowedDatabaseFacingValues': 'Range(0, 10)',
};


let validSettings = [
  validIntegerSetting,
  validFloatSetting,
  validStringSetting,
  validBooleanSetting,
];

const MOCK_NON_EMPTY_QUALIFICATION_WO_NAME = 'categories';
const SEPARATOR = '.';
const SETTINGS_COMMAND_ALIAS = '!settings';
const MOCK_CHANNEL_ID = '111';

function createSetting(settingBlob) {
  return new Setting(settingBlob, MOCK_NON_EMPTY_QUALIFICATION_WO_NAME, SEPARATOR, 0, SETTINGS_COMMAND_ALIAS);
}

describe('Abstract settings element', function() {
  describe('constructor()', function() {
    it('throws if child is missing a function', function() {
      assert.throws(() => new MockSettingsElementMissingFunction());
    });
  });
});

describe('Setting', function() {
  describe('constructor()', function() {
    it('Constructs valid settings without throwing.', function() {
      for (let setting of validSettings) {
        createSetting(setting);
      }
    });
    it('Throws if the value type is invalid', function() {
      assert.throws(() => createSetting(invalidValueTypeSetting1));
      assert.throws(() => createSetting(invalidValueTypeSetting2));
    });
    it('Throws for invalid setting description', function() {
      assert.throws(() => createSetting(invalidDescriptionSetting1));
      assert.throws(() => createSetting(invalidDescriptionSetting2));
    });
    it('Throws for invalid user facing name', function() {
      assert.throws(() => createSetting(invalidUserFacingName1));
      assert.throws(() => createSetting(invalidUserFacingName2));
      assert.throws(() => createSetting(invalidUserFacingName3));
    });
    it('Throws for invalid database facing name', function() {
      assert.throws(() => createSetting(invalidDatabaseFacingName1));
      assert.throws(() => createSetting(invalidDatabaseFacingName2));
    });
    it('Throws for no database facing value', function() {
      assert.throws(() => createSetting(invalidDatabaseFacingValue1));
    });
    it('Throws for invalid database facing values', function() {
      assert.throws(() => createSetting(invalidDatabaseFacingValues1));
      assert.throws(() => createSetting(invalidDatabaseFacingValues2));
    });
    it('Resolves or fails to resolve as appropriate', function() {
      let userFacingName = 'name';
      let settingData = {
        'type': 'SETTING',
        'userFacingName': userFacingName,
        'description': 'My name.',
        'valueType': 'STRING',
        'defaultDatabaseFacingValue': 'Tom',
      };
      let setting = createSetting(settingData);
      let settingName = MOCK_NON_EMPTY_QUALIFICATION_WO_NAME + SEPARATOR + userFacingName;
      assert(setting.getFullyQualifiedUserFacingName() === settingName);
      let notSettingName1 = MOCK_NON_EMPTY_QUALIFICATION_WO_NAME + SEPARATOR + 'fff';
      let notSettingName2 = MOCK_NON_EMPTY_QUALIFICATION_WO_NAME + SEPARATOR;
      let notSettingName3 = SEPARATOR + userFacingName;
      let notSettingName4 = userFacingName;
      let notSettingName5 = userFacingName + SEPARATOR;
      let notSettingName6 = MOCK_NON_EMPTY_QUALIFICATION_WO_NAME + SEPARATOR + userFacingName + SEPARATOR;
      assert(setting.getChildForFullyQualifiedUserFacingName(settingName));
      assert(!setting.getChildForFullyQualifiedUserFacingName(notSettingName1));
      assert(!setting.getChildForFullyQualifiedUserFacingName(notSettingName2));
      assert(!setting.getChildForFullyQualifiedUserFacingName(notSettingName3));
      assert(!setting.getChildForFullyQualifiedUserFacingName(notSettingName4));
      assert(!setting.getChildForFullyQualifiedUserFacingName(notSettingName5));
      assert(!setting.getChildForFullyQualifiedUserFacingName(notSettingName6));
    });
    it('Returns default value if nothing in database', function() {
      let setting = createSetting(validIntegerSetting);
      assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID, {}) === validIntegerSetting.defaultDatabaseFacingValue);
    });
    it('Returns server setting value if no channel value', function() {
      const serverSettingValue = 5;
      let setting = createSetting(validIntegerSetting);
      let settings = {serverSettings: {}};
      settings.serverSettings[setting.getFullyQualifiedUserFacingName()] = serverSettingValue;
      assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID, settings) === serverSettingValue);
    });
    it('Returns server setting value if no channel value for this channel', function() {
      const serverSettingValue = 5;
      const channelSettingValue = 3;
      const fakeChannelId = 'fake_channel';
      let setting = createSetting(validIntegerSetting);
      let settings = {serverSettings: {}, channelSettings: {}};
      settings.channelSettings[fakeChannelId] = {};
      settings.serverSettings[setting.getFullyQualifiedUserFacingName()] = serverSettingValue;
      settings.channelSettings[fakeChannelId][setting.getFullyQualifiedUserFacingName()] = channelSettingValue;
      assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID, settings) === serverSettingValue);
    });
    it('Returns channel setting value if it exists', function() {
      const serverSettingValue = 5;
      const channelSettingValue = 3;
      let setting = createSetting(validIntegerSetting);
      let settings = {serverSettings: {}, channelSettings: {}};
      settings.channelSettings[MOCK_CHANNEL_ID] = {};
      settings.serverSettings[setting.getFullyQualifiedUserFacingName()] = serverSettingValue;
      settings.channelSettings[MOCK_CHANNEL_ID][setting.getFullyQualifiedUserFacingName()] = channelSettingValue;
      assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID, settings) === channelSettingValue);
    });
  });
});