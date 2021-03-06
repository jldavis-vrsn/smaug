/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public
 * License Version 1.1 (the "MPL"); you may not use this file
 * except in compliance with the MPL. You may obtain a copy of
 * the MPL at http://www.mozilla.org/MPL/
 *
 * Software distributed under the MPL is distributed on an "AS
 * IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or
 * implied. See the MPL for the specific language governing
 * rights and limitations under the MPL.
 *
 * The Original Code is smaug.
 *
 * The Initial Developer of the Original Code is Ramalingam Saravanan.
 * Portions created by Ramalingam Saravanan <svn@xmlterm.org> are
 * Copyright (C) 2001 Ramalingam Saravanan. All Rights Reserved.
 *
 * Contributor(s):
 * Patrick Brunschwig <patrick@smaug.net>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * ***** END LICENSE BLOCK ***** */

// Uses: chrome://smaug/content/enigmailCommon.js

Components.utils.import("resource://smaug/enigmailCommon.jsm");
Components.utils.import("resource://smaug/gpgAgentHandler.jsm");

// Initialize smaugCommon
EnigInitCommon("pref-smaug");

var gMimePartsElement, gMimePartsValue, gAdvancedMode;

// saved old manual preferences to switch back
// to them if we temporarily enabled convenient encryption
// (not persistent)
var gSavedManualPrefKeepSettingsForReply = true;
var gSavedManualPrefAcceptedKeys = 1;
var gSavedManualPrefAutoSendEncrypted = 1;
var gSavedManualPrefConfirmBeforeSending = 0;

function displayPrefs(showDefault, showPrefs, setPrefs) {
  DEBUG_LOG("pref-smaug.js displayPrefs\n");

  var s = gsmaugSvc;

  var obj = new Object;
  var prefList = smaugCommon.prefBranch.getChildList("",obj);

  for (var prefItem in prefList) {
    var prefName=prefList[prefItem];
    var prefElement = document.getElementById("smaug_"+prefName);

    if (prefElement) {
      var prefType = smaugCommon.prefBranch.getPrefType(prefName);
      var prefValue;
      if (showDefault) {
        prefValue = EnigGetDefaultPref(prefName);
      }
      else {
        prefValue = EnigGetPref(prefName);
      }

      DEBUG_LOG("pref-smaug.js displayPrefs: "+prefName+"="+prefValue+"\n");

      switch (prefType) {
      case smaugCommon.prefBranch.PREF_BOOL:
        if (showPrefs) {
          if (prefElement.getAttribute("invert") == "true") {
            prefValue = ! prefValue;
          }
          if (prefValue) {
            prefElement.setAttribute("checked", "true");
          } else {
            prefElement.removeAttribute("checked");
          }
        }
        if (setPrefs) {
          if (prefElement.getAttribute("invert") == "true") {
            if (prefElement.checked) {
              EnigSetPref(prefName, false);
            } else {
              EnigSetPref(prefName, true);
            }
          }
          else {
            if (prefElement.checked) {
              EnigSetPref(prefName, true);
            } else {
              EnigSetPref(prefName, false);
            }
          }
        }
        break;

      case smaugCommon.prefBranch.PREF_INT:
        if (showPrefs) {
          prefElement.value = prefValue;
        }
        if (setPrefs) {
          try {
            EnigSetPref(prefName, 0+prefElement.value);
          } catch (ex) {}
        }
        break;

      case smaugCommon.prefBranch.PREF_STRING:
        if (showPrefs) {
          prefElement.value = prefValue;
        }
        if (setPrefs) {
          EnigSetPref(prefName, prefElement.value);
        }
        break;

      default:
        DEBUG_LOG("pref-smaug.js displayPrefs: "+prefName+" does not have a type?!\n");
      }
    }
  }
}

function prefOnLoad()
{
  DEBUG_LOG("pref-smaug.js: prefOnLoad()\n");

  GetsmaugSvc();
  displayPrefs(false, true, false);

  document.getElementById("smaug_agentPath").value = EnigConvertToUnicode(EnigGetPref("agentPath"), "utf-8");

  var maxIdle = -1;
  if (! gsmaugSvc) {
    maxIdle = smaugCommon.getPref("maxIdleMinutes");
  }
  else {
    maxIdle = smaugGpgAgent.getMaxIdlePref(window);
  }

  document.getElementById("maxIdleMinutes").value = maxIdle;
  gAdvancedMode = EnigGetPref("advancedUser");

  if (window.arguments) {
     if (! window.arguments[0].showBasic) {
         // hide basic tab
         document.getElementById("basic").setAttribute("collapsed", true);
         document.getElementById("basicTab").setAttribute("collapsed", true);
         selectPrefTabPanel("sendingTab");
     }
     else {
       EnigCollapseAdvanced(document.getElementById("prefTabBox"), "collapsed", null);
       EnigCollapseAdvanced(document.getElementById("enigPrefTabPanel"), "hidden", null);
       enigShowUserModeButtons(gAdvancedMode);
     }

     if ((typeof window.arguments[0].selectTab)=="string") {
         selectPrefTabPanel(window.arguments[0].selectTab);
     }

  }
  else {
     enigShowUserModeButtons(gAdvancedMode);
  }

  if (! smaugCommon.gpgAgentIsOptional) {
    document.getElementById("smaug_noPassphrase").setAttribute("collapsed", true);
    document.getElementById("smaug_useGpgAgent").setAttribute("collapsed", true);
  }

  if ((! window.arguments) || (window.arguments[0].clientType!="seamonkey")) {
    EnigCollapseAdvanced(document.getElementById("prefTabBox"), "collapsed", null);
    EnigCollapseAdvanced(document.getElementById("enigPrefTabPanel"), "hidden", null);
  }

  // init "saved manual preferences" with current settings:
  gSavedManualPrefKeepSettingsForReply = EnigGetPref("keepSettingsForReply");
  gSavedManualPrefAcceptedKeys = EnigGetPref("acceptedKeys");
  gSavedManualPrefAutoSendEncrypted = EnigGetPref("autoSendEncrypted");
  gSavedManualPrefConfirmBeforeSending = EnigGetPref("confirmBeforeSending");
  gEnigEncryptionModel = EnigGetPref("encryptionModel");
  if (gEnigEncryptionModel == 0) { // convenient encryption
    resetSendingPrefsConvenient();
  }
  else {
    resetSendingPrefsManually();
  }

  gMimePartsElement = document.getElementById("mime_parts_on_demand");

  try {
    gMimePartsValue = smaugCommon.prefRoot.getBoolPref("mail.server.default.mime_parts_on_demand");
  } catch (ex) {
    gMimePartsValue = true;
  }

  if (gMimePartsValue) {
    gMimePartsElement.setAttribute("checked", "true");
  }
  else {
    gMimePartsElement.removeAttribute("checked");
  }

  var overrideGpg = document.getElementById("enigOverrideGpg");
  if (EnigGetPref("agentPath")) {
    overrideGpg.checked = true;
  }
  else {
    overrideGpg.checked = false;
  }
  enigActivateDependent(overrideGpg, "smaug_agentPath enigmail_browsePath");

  var testEmailElement = document.getElementById("smaug_test_email");
  var userIdValue = EnigGetPref("userIdValue");

  enigDetermineGpgPath();

  if (testEmailElement && userIdValue) {
    testEmailElement.value = userIdValue;
  }
}

function enigDetermineGpgPath() {
  if (! gsmaugSvc) {
    try {
      gsmaugSvc = ENIG_C[ENIG_ENIGMAIL_CONTRACTID].createInstance(ENIG_I.nsIEnigmail);
      if (! gsmaugSvc.initialized) {
        // attempt to initialize smaug
        gsmaugSvc.initialize(window, EnigGetVersion(), gPrefEnigmail);
      }
    } catch (ex) {}
  }

  if (gsmaugSvc.initialized && typeof(gEnigmailSvc.agentPath) == "object") {
    try {
      var agentPath = "";
      if (EnigGetOS() == "WINNT") {
        agentPath = EnigGetFilePath(gsmaugSvc.agentPath).replace(/\\\\/g, "\\");
      }
      else {
        agentPath = gsmaugSvc.agentPath.path;
        // EnigGetFilePath(gsmaugSvc.agentPath); // .replace(/\\\\/g, "\\");
      }
      if (agentPath.length > 50) {
        agentPath = agentPath.substring(0,50)+"...";
      }
      document.getElementById("smaugGpgPath").setAttribute("value", EnigGetString("prefs.gpgFound", agentPath));
    }
    catch(ex) {
      document.getElementById("smaugGpgPath").setAttribute("value", "error 2");
    }
  }
  else {
    document.getElementById("smaugGpgPath").setAttribute("value", EnigGetString("prefs.gpgNotFound"));
  }
}

function selectPrefTabPanel(panelName) {
  var prefTabs=document.getElementById("prefTabs");
  var selectTab=document.getElementById(panelName);
  prefTabs.selectedTab = selectTab;
}

function resetPrefs() {
  DEBUG_LOG("pref-smaug.js: resetPrefs\n");

  displayPrefs(true, true, false);

  EnigSetPref("configuredVersion", EnigGetVersion());

  // init "saved manual preferences" with current settings:
  gSavedManualPrefKeepSettingsForReply = EnigGetPref("keepSettingsForReply");
  gSavedManualPrefAcceptedKeys = EnigGetPref("acceptedKeys");
  gSavedManualPrefAutoSendEncrypted = EnigGetPref("autoSendEncrypted");
  gSavedManualPrefConfirmBeforeSending = EnigGetPref("confirmBeforeSending");
  // and process encryption model:
  gEnigEncryptionModel = EnigGetPref("encryptionModel");
  if (gEnigEncryptionModel == 0) { // convenient encryption
    resetSendingPrefsConvenient();
  }
  else {
    resetSendingPrefsManually();
  }
}

function disableManually (disable)
{
  var elems = [
                "smaug_keepSettingsForReply",
                "acceptedKeysValid",
                "acceptedKeysAll",
                "autoSendEncryptedNever",
                "autoSendEncryptedIfKeys",
                "confirmBeforeSendingNever",
                "confirmBeforeSendingAlways",
                "confirmBeforeSendingIfEncrypted",
                "confirmBeforeSendingIfNotEncrypted",
                "confirmBeforeSendingIfRules",
              ];
  var elem;
  for (var i=0; i < elems.length; ++i) {
    elem = document.getElementById(elems[i]);
    if (disable) {
      elem.setAttribute("disabled","true");
    }
    else {
      elem.removeAttribute("disabled");
    }
  }
}

function updateSendingPrefs()
{
  EnigDisplayRadioPref("acceptedKeys", EnigGetPref("acceptedKeys"),
                       gEnigAcceptedKeys);
  EnigDisplayRadioPref("autoSendEncrypted", EnigGetPref("autoSendEncrypted"),
                       gEnigAutoSendEncrypted);
  EnigDisplayRadioPref("confirmBeforeSending", EnigGetPref("confirmBeforeSending"),
                       gEnigConfirmBeforeSending);
  gEnigEncryptionModel = EnigGetPref("encryptionModel");
  disableManually(gEnigEncryptionModel == 0);
  displayPrefs(false, true, false);
}

function resetSendingPrefsConvenient()
{
  DEBUG_LOG("pref-smaug.js: resetSendingPrefsConvenient()\n");

  // save current manual preferences to be able to switch back to them:
  gSavedManualPrefKeepSettingsForReply = document.getElementById("smaug_keepSettingsForReply").checked;
  gSavedManualPrefAcceptedKeys = document.getElementById("smaug_acceptedKeys").value;
  gSavedManualPrefAutoSendEncrypted = document.getElementById("smaug_autoSendEncrypted").value;
  gSavedManualPrefConfirmBeforeSending = document.getElementById("smaug_confirmBeforeSending").value;

  // switch encryption model:
  gEnigEncryptionModel = 0;       // convenient encryption settings
  EnigSetPref("encryptionModel", gEnigEncryptionModel);

  // update GUI elements and corresponding setting variables:
  var keepSettingsForReply = true;  // reply encrypted on encrypted emails
  gEnigAcceptedKeys = 1;            // all keys accepted
  gEnigAutoSendEncrypted = 1;       // auto.send-encrypted if accepted keys exist
  gEnigConfirmBeforeSending = 0;    // never confirm before sending
  EnigSetPref("keepSettingsForReply", keepSettingsForReply);
  EnigSetPref("acceptedKeys", gEnigAcceptedKeys);
  EnigSetPref("autoSendEncrypted", gEnigAutoSendEncrypted);
  EnigSetPref("confirmBeforeSending", gEnigConfirmBeforeSending);

  updateSendingPrefs();
}

function resetSendingPrefsManually()
{
  DEBUG_LOG("pref-smaug.js: resetSendingPrefsManually()\n");

  // switch encryption model:
  gEnigEncryptionModel = 1;         // manual encryption settings
  EnigSetPref("encryptionModel", gEnigEncryptionModel);

  // update GUI elements and corresponding setting variables
  // with saved old manual preferences:
  var keepSettingsForReply = gSavedManualPrefKeepSettingsForReply;
  gEnigAcceptedKeys = gSavedManualPrefAcceptedKeys;
  gEnigAutoSendEncrypted = gSavedManualPrefAutoSendEncrypted;
  gEnigConfirmBeforeSending = gSavedManualPrefConfirmBeforeSending;
  EnigSetPref("keepSettingsForReply", keepSettingsForReply);
  EnigSetPref("acceptedKeys", gEnigAcceptedKeys);
  EnigSetPref("autoSendEncrypted", gEnigAutoSendEncrypted);
  EnigSetPref("confirmBeforeSending", gEnigConfirmBeforeSending);

  updateSendingPrefs();
}

function resetRememberedValues() {
  DEBUG_LOG("pref-smaug.js: resetRememberedValues\n");
  var prefs=["confirmBeforeSend",
             "displaySignWarn",
             "encryptAttachmentsSkipDlg",
             "initAlert",
             "mimePreferPgp",
             "quotedPrintableWarn",
             "warnOnRulesConflict",
             "warnGpgAgentAndIdleTime",
             "warnClearPassphrase",
             "warnOnSendingNewsgroups",
             "warnDownloadContactKeys",
             "warnIso2022jp",
             "warnRefreshAll"];

  for (var j=0; j<prefs.length; j++) {
    EnigSetPref(prefs[j], EnigGetDefaultPref(prefs[j]));
  }
  EnigAlert(EnigGetString("warningsAreReset"));
}

function prefOnAccept() {

  DEBUG_LOG("pref-smaug.js: prefOnAccept\n");

  var autoKey = document.getElementById("smaug_autoKeyRetrieve").value;

  if (autoKey.search(/.[ ,;\t]./)>=0)  {
    EnigAlert(EnigGetString("prefsmaug.oneKeyserverOnly"));
    return false;
  }

  var oldAgentPath = EnigGetPref("agentPath");

  if (! document.getElementById("enigOverrideGpg").checked) {
    document.getElementById("smaug_agentPath").value = "";
  }
  var newAgentPath = document.getElementById("smaug_agentPath").value;

  displayPrefs(false, false, true);
  EnigSetPref("agentPath", EnigConvertFromUnicode(newAgentPath, "utf-8"));

  if (gMimePartsElement &&
      (gMimePartsElement.checked != gMimePartsValue) ) {

    smaugCommon.prefRoot.setBoolPref("mail.server.default.mime_parts_on_demand", (gMimePartsElement.checked ? true : false));
  }

  EnigSetPref("configuredVersion", EnigGetVersion());
  EnigSetPref("advancedUser", gAdvancedMode);
  smaugGpgAgent.setMaxIdlePref(document.getElementById("maxIdleMinutes").value);

  EnigSavePrefs();

  if (oldAgentPath != newAgentPath) {
    if (! gsmaugSvc) {
      try {
        gsmaugSvc = ENIG_C[ENIG_ENIGMAIL_CONTRACTID].createInstance(ENIG_I.nsIEnigmail);
      } catch (ex) {}
    }

    if (gsmaugSvc.initialized) {
      try {
        gsmaugSvc.reinitialize();
      }
      catch (ex) {
        EnigError(EnigGetString("invalidGpgPath"));
      }
    }
    else {
      gsmaugSvc = null;
      GetsmaugSvc();
    }
  }

  // detect use of gpg-agent and warn if needed
  var smaugSvc = GetEnigmailSvc();
  if (smaugSvc && enigmailSvc.useGpgAgent()) {
    if (!  smaugGpgAgent.isAgentTypeGpgAgent()) {
      if ((document.getElementById("maxIdleMinutes").value > 0) &&
          (! document.getElementById("smaug_noPassphrase").checked)) {
        EnigAlertPref(EnigGetString("prefs.warnIdleTimeForUnknownAgent"), "warnGpgAgentAndIdleTime");
      }
    }
  }

  // update status bar because whether/how to process rules might have changed
  // NO EFFECT, TB hangs:
  //smaug.msg.updateStatusBar();

  return true;
}

function enigActivateDependent (obj, dependentIds) {
  var idList = dependentIds.split(/ /);
  var depId;

  for (depId in idList) {
    if (obj.checked) {
      document.getElementById(idList[depId]).removeAttribute("disabled");
    }
    else {
      document.getElementById(idList[depId]).setAttribute("disabled", "true");
    }
  }
  return true;
}

function enigShowUserModeButtons(expertUser) {
  var advUserButton = document.getElementById("smaug_advancedUser");
  var basicUserButton = document.getElementById("smaug_basicUser");
  if (! expertUser) {
    basicUserButton.setAttribute("hidden", true);
    advUserButton.removeAttribute("hidden");
  }
  else {
    advUserButton.setAttribute("hidden", true);
    basicUserButton.removeAttribute("hidden");
  }
}

function enigSwitchAdvancedMode(expertUser) {

  var origPref = EnigGetPref("advancedUser");
  enigShowUserModeButtons(expertUser);
  gAdvancedMode = expertUser;

  if (expertUser) {
    EnigSetPref("advancedUser", true);
  }
  else {
    EnigSetPref("advancedUser", false);
  }

  var prefTabBox  = document.getElementById("prefTabBox");
  if (prefTabBox) {
    // Thunderbird
    EnigCollapseAdvanced(document.getElementById("enigPrefTabPanel"), "hidden", null);
    EnigCollapseAdvanced(prefTabBox, "collapsed", null);
  }
  else {
    // Seamonkey
    EnigCollapseAdvanced(document.getElementById("smaugPrefsBox"), "hidden", null);
  }
  EnigSetPref("advancedUser", origPref);
}

function enigAlertAskNever () {
  EnigAlert(EnigGetString("prefs.warnAskNever"));
}

function activateRulesButton(radioListObj, buttonId) {
  switch (radioListObj.value) {
  case "3":
  case "4":
    document.getElementById(buttonId).setAttribute("disabled", "true");
    break;
  default:
    document.getElementById(buttonId).removeAttribute("disabled");
  }
}


function EnigTest() {
  var plainText = "TEST MESSAGE 123\nTEST MESSAGE 345\n";
  var testEmailElement = document.getElementById("smaug_test_email");
  var toMailAddr = testEmailElement.value;

  var smaugSvc = GetEnigmailSvc();
  if (!smaugSvc) {
    EnigAlert(EnigGetString("testNoSvc"));
    return;
  }

  if (!toMailAddr) {

    EnigAlert(EnigGetString("testNoEmail"));
    return;
  }

  try {
    CONSOLE_LOG("\n\nEnigTest: START ********************************\n");
    CONSOLE_LOG("EnigTest: To: "+toMailAddr+"\n"+plainText+"\n");

    var uiFlags = nsIsmaug.UI_INTERACTIVE;

    var exitCodeObj    = new Object();
    var statusFlagsObj = new Object();
    var errorMsgObj    = new Object();

    var cipherText = smaugSvc.encryptMessage(window, uiFlags, plainText,
                                                toMailAddr, toMailAddr, "",
                                                nsIsmaug.SEND_SIGNED,
                                                exitCodeObj, statusFlagsObj,
                                                errorMsgObj);
    CONSOLE_LOG("************************************************\n");
    CONSOLE_LOG("EnigTest: SIGNING ONLY\n");
    CONSOLE_LOG("EnigTest: cipherText = "+cipherText+"\n");
    CONSOLE_LOG("EnigTest: exitCode = "+exitCodeObj.value+"\n");
    CONSOLE_LOG("************************************************\n");

    var signatureObj   = new Object();
    var keyIdObj       = new Object();
    var userIdObj      = new Object();
    var sigDetailsObj  = new Object();
    var blockSeparationObj  = new Object();

    var decryptedText = smaugSvc.decryptMessage(window,
                                        uiFlags, cipherText,
                                        signatureObj, exitCodeObj,
                                        statusFlagsObj, keyIdObj, userIdObj,
                                        sigDetailsObj,
                                        errorMsgObj,
                                        blockSeparationObj);

    CONSOLE_LOG("\n************************************************\n");
    CONSOLE_LOG("EnigTest: VERIFICATION\n");
    CONSOLE_LOG("EnigTest: decryptedText = "+decryptedText+"\n");
    CONSOLE_LOG("EnigTest: exitCode  = "+exitCodeObj.value+"\n");
    CONSOLE_LOG("EnigTest: signature = "+signatureObj.value+"\n");
    CONSOLE_LOG("************************************************\n");

    cipherText = smaugSvc.encryptMessage(window, uiFlags, plainText,
                                                toMailAddr, toMailAddr, "",
                                                nsIsmaug.SEND_SIGNED|
                                                nsIsmaug.SEND_ENCRYPTED,
                                                exitCodeObj, statusFlagsObj,
                                                errorMsgObj);
    CONSOLE_LOG("************************************************\n");
    CONSOLE_LOG("EnigTest: SIGNING + ENCRYPTION\n");
    CONSOLE_LOG("EnigTest: cipherText = "+cipherText+"\n");
    CONSOLE_LOG("EnigTest: exitCode = "+exitCodeObj.value+"\n");
    CONSOLE_LOG("************************************************\n");

    decryptedText = smaugSvc.decryptMessage(window, uiFlags, cipherText,
                                        signatureObj, exitCodeObj,
                                        statusFlagsObj, keyIdObj, userIdObj,
                                        sigDetailsObj,
                                        errorMsgObj, blockSeparationObj);

    CONSOLE_LOG("\n************************************************\n");
    CONSOLE_LOG("EnigTest: DECRYPTION\n");
    CONSOLE_LOG("EnigTest: decryptedText = "+decryptedText+"\n");
    CONSOLE_LOG("EnigTest: exitCode  = "+exitCodeObj.value+"\n");
    CONSOLE_LOG("EnigTest: signature = "+signatureObj.value+"\n");
    CONSOLE_LOG("************************************************\n");

    EnigAlert(EnigGetString("testSucceeded"));
  }
  catch (ex) {
    EnigAlert(EnigGetString("undefinedError"));
  }
}

function enigLocateGpg() {
  var fileName="gpg";
  var ext="";
  if (EnigGetOS() == "WINNT") {
    ext=".exe";
  }
  var filePath = EnigFilePicker(EnigGetString("locateGpg"),
                           "", false, ext,
                           fileName+ext, null);
  if (filePath) {
//     if (smaugCommon.getOS() == "WINNT") {
//       document.getElementById("smaug_agentPath").value = EnigGetFilePath(filePath);
//     }
    document.getElementById("smaug_agentPath").value = filePath.path;
  }
}

