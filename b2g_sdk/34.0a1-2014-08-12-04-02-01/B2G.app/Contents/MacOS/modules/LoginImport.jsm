"use strict";this.EXPORTED_SYMBOLS=["LoginImport",];const Cc=Components.classes;const Ci=Components.interfaces;const Cu=Components.utils;const Cr=Components.results;Cu.import("resource://gre/modules/XPCOMUtils.jsm");Cu.import("resource://gre/modules/Task.jsm");XPCOMUtils.defineLazyModuleGetter(this,"OS","resource://gre/modules/osfile.jsm");XPCOMUtils.defineLazyModuleGetter(this,"Sqlite","resource://gre/modules/Sqlite.jsm");XPCOMUtils.defineLazyModuleGetter(this,"NetUtil","resource://gre/modules/NetUtil.jsm");this.LoginImport=function(aStore,aPath)
{this.store=aStore;this.path=aPath;}
this.LoginImport.prototype={store:null,path:null,import:Task.async(function*(){


if(this.store.data.logins.length>0||this.store.data.disabledHosts.length>0){throw new Error("Unable to import saved passwords because some data "+"has already been imported or saved.");}
let referenceTimeMs=Date.now();let connection=yield Sqlite.openConnection({path:this.path});try{let schemaVersion=yield connection.getSchemaVersion();if(schemaVersion<3){throw new Error("Unable to import saved passwords because "+"the existing profile is too old.");}
let rows=yield connection.execute("SELECT * FROM moz_logins");for(let row of rows){try{let hostname=row.getResultByName("hostname");let httpRealm=row.getResultByName("httpRealm");let formSubmitURL=row.getResultByName("formSubmitURL");let usernameField=row.getResultByName("usernameField");let passwordField=row.getResultByName("passwordField");let encryptedUsername=row.getResultByName("encryptedUsername");let encryptedPassword=row.getResultByName("encryptedPassword");

let guid=row.getResultByName("guid");let encType=row.getResultByName("encType");let timeCreated=null;let timeLastUsed=null;let timePasswordChanged=null;let timesUsed=null;try{timeCreated=row.getResultByName("timeCreated");timeLastUsed=row.getResultByName("timeLastUsed");timePasswordChanged=row.getResultByName("timePasswordChanged");timesUsed=row.getResultByName("timesUsed");}catch(ex){}


if(!timeCreated){timeCreated=referenceTimeMs;}
if(!timeLastUsed){timeLastUsed=referenceTimeMs;}
if(!timePasswordChanged){timePasswordChanged=referenceTimeMs;}
if(!timesUsed){timesUsed=1;}
this.store.data.logins.push({id:this.store.data.nextId++,hostname:hostname,httpRealm:httpRealm,formSubmitURL:formSubmitURL,usernameField:usernameField,passwordField:passwordField,encryptedUsername:encryptedUsername,encryptedPassword:encryptedPassword,guid:guid,encType:encType,timeCreated:timeCreated,timeLastUsed:timeLastUsed,timePasswordChanged:timePasswordChanged,timesUsed:timesUsed,});}catch(ex){Cu.reportError("Error importing login: "+ex);}}
rows=yield connection.execute("SELECT * FROM moz_disabledHosts");for(let row of rows){try{let id=row.getResultByName("id");let hostname=row.getResultByName("hostname");this.store.data.disabledHosts.push(hostname);}catch(ex){Cu.reportError("Error importing disabled host: "+ex);}}}finally{yield connection.close();}}),};