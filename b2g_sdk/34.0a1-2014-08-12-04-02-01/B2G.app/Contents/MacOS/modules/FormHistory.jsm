this.EXPORTED_SYMBOLS=["FormHistory"];const Cc=Components.classes;const Ci=Components.interfaces;const Cr=Components.results;Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");Components.utils.import("resource://gre/modules/Services.jsm");XPCOMUtils.defineLazyServiceGetter(this,"uuidService","@mozilla.org/uuid-generator;1","nsIUUIDGenerator");const DB_SCHEMA_VERSION=4;const DAY_IN_MS=86400000;const MAX_SEARCH_TOKENS=10;const NOOP=function noop(){};let supportsDeletedTable=false;let Prefs={initialized:false,get debug(){this.ensureInitialized();return this._debug;},get enabled(){this.ensureInitialized();return this._enabled;},get expireDays(){this.ensureInitialized();return this._expireDays;},ensureInitialized:function(){if(this.initialized)
return;this.initialized=true;this._debug=Services.prefs.getBoolPref("browser.formfill.debug");this._enabled=Services.prefs.getBoolPref("browser.formfill.enable");this._expireDays=Services.prefs.getIntPref("browser.formfill.expire_days");}};function log(aMessage){if(Prefs.debug){Services.console.logStringMessage("FormHistory: "+aMessage);}}
function sendNotification(aType,aData){if(typeof aData=="string"){let strWrapper=Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);strWrapper.data=aData;aData=strWrapper;}
else if(typeof aData=="number"){let intWrapper=Cc["@mozilla.org/supports-PRInt64;1"].createInstance(Ci.nsISupportsPRInt64);intWrapper.data=aData;aData=intWrapper;}
else if(aData){throw Components.Exception("Invalid type "+(typeof aType)+" passed to sendNotification",Cr.NS_ERROR_ILLEGAL_VALUE);}
Services.obs.notifyObservers(aData,"satchel-storage-changed",aType);}
const dbSchema={tables:{moz_formhistory:{"id":"INTEGER PRIMARY KEY","fieldname":"TEXT NOT NULL","value":"TEXT NOT NULL","timesUsed":"INTEGER","firstUsed":"INTEGER","lastUsed":"INTEGER","guid":"TEXT",},moz_deleted_formhistory:{"id":"INTEGER PRIMARY KEY","timeDeleted":"INTEGER","guid":"TEXT"}},indices:{moz_formhistory_index:{table:"moz_formhistory",columns:["fieldname"]},moz_formhistory_lastused_index:{table:"moz_formhistory",columns:["lastUsed"]},moz_formhistory_guid_index:{table:"moz_formhistory",columns:["guid"]},}};const validFields=["fieldname","value","timesUsed","firstUsed","lastUsed","guid",];const searchFilters=["firstUsedStart","firstUsedEnd","lastUsedStart","lastUsedEnd",];function validateOpData(aData,aDataType){let thisValidFields=validFields;if(aDataType=="Update"&&"newGuid"in aData){thisValidFields=["guid","newGuid"];}
for(let field in aData){if(field!="op"&&thisValidFields.indexOf(field)==-1){throw Components.Exception(aDataType+" query contains an unrecognized field: "+field,Cr.NS_ERROR_ILLEGAL_VALUE);}}
return aData;}
function validateSearchData(aData,aDataType){for(let field in aData){if(field!="op"&&validFields.indexOf(field)==-1&&searchFilters.indexOf(field)==-1){throw Components.Exception(aDataType+" query contains an unrecognized field: "+field,Cr.NS_ERROR_ILLEGAL_VALUE);}}}
function makeQueryPredicates(aQueryData,delimiter=' AND '){return Object.keys(aQueryData).map(function(field){if(field=="firstUsedStart"){return"firstUsed >= :"+field;}else if(field=="firstUsedEnd"){return"firstUsed <= :"+field;}else if(field=="lastUsedStart"){return"lastUsed >= :"+field;}else if(field=="lastUsedEnd"){return"lastUsed <= :"+field;}
return field+" = :"+field;}).join(delimiter);}
function makeCountStatement(aSearchData){let query="SELECT COUNT(*) AS numEntries FROM moz_formhistory";let queryTerms=makeQueryPredicates(aSearchData);if(queryTerms){query+=" WHERE "+queryTerms;}
return dbCreateAsyncStatement(query,aSearchData);}
function makeSearchStatement(aSearchData,aSelectTerms){let query="SELECT "+aSelectTerms.join(", ")+" FROM moz_formhistory";let queryTerms=makeQueryPredicates(aSearchData);if(queryTerms){query+=" WHERE "+queryTerms;}
return dbCreateAsyncStatement(query,aSearchData);}
function makeAddStatement(aNewData,aNow,aBindingArrays){let query="INSERT INTO moz_formhistory (fieldname, value, timesUsed, firstUsed, lastUsed, guid) "+"VALUES (:fieldname, :value, :timesUsed, :firstUsed, :lastUsed, :guid)";aNewData.timesUsed=aNewData.timesUsed||1;aNewData.firstUsed=aNewData.firstUsed||aNow;aNewData.lastUsed=aNewData.lastUsed||aNow;return dbCreateAsyncStatement(query,aNewData,aBindingArrays);}
function makeBumpStatement(aGuid,aNow,aBindingArrays){let query="UPDATE moz_formhistory SET timesUsed = timesUsed + 1, lastUsed = :lastUsed WHERE guid = :guid";let queryParams={lastUsed:aNow,guid:aGuid,};return dbCreateAsyncStatement(query,queryParams,aBindingArrays);}
function makeRemoveStatement(aSearchData,aBindingArrays){let query="DELETE FROM moz_formhistory";let queryTerms=makeQueryPredicates(aSearchData);if(queryTerms){log("removeEntries");query+=" WHERE "+queryTerms;}else{log("removeAllEntries");
}
return dbCreateAsyncStatement(query,aSearchData,aBindingArrays);}
function makeUpdateStatement(aGuid,aNewData,aBindingArrays){let query="UPDATE moz_formhistory SET ";let queryTerms=makeQueryPredicates(aNewData,', ');if(!queryTerms){throw Components.Exception("Update query must define fields to modify.",Cr.NS_ERROR_ILLEGAL_VALUE);}
query+=queryTerms+" WHERE guid = :existing_guid";aNewData["existing_guid"]=aGuid;return dbCreateAsyncStatement(query,aNewData,aBindingArrays);}
function makeMoveToDeletedStatement(aGuid,aNow,aData,aBindingArrays){if(supportsDeletedTable){let query="INSERT INTO moz_deleted_formhistory (guid, timeDeleted)";let queryTerms=makeQueryPredicates(aData);if(aGuid){query+=" VALUES (:guid, :timeDeleted)";}else{
 if(!queryTerms)
return;query+=" SELECT guid, :timeDeleted FROM moz_formhistory WHERE "+queryTerms;}
aData.timeDeleted=aNow;return dbCreateAsyncStatement(query,aData,aBindingArrays);}
return null;}
function generateGUID(){let uuid=uuidService.generateUUID().toString();let raw=""; let bytes=0;for(let i=1;bytes<12;i+=2){ if(uuid[i]=="-")
i++;let hexVal=parseInt(uuid[i]+uuid[i+1],16);raw+=String.fromCharCode(hexVal);bytes++;}
return btoa(raw);}
let _dbConnection=null;XPCOMUtils.defineLazyGetter(this,"dbConnection",function(){let dbFile;try{dbFile=Services.dirsvc.get("ProfD",Ci.nsIFile).clone();dbFile.append("formhistory.sqlite");log("Opening database at "+dbFile.path);_dbConnection=Services.storage.openUnsharedDatabase(dbFile);dbInit();}catch(e if e.result==Cr.NS_ERROR_FILE_CORRUPTED){dbCleanup(dbFile);_dbConnection=Services.storage.openUnsharedDatabase(dbFile);dbInit();}
return _dbConnection;});let dbStmts=new Map();function dbCreateAsyncStatement(aQuery,aParams,aBindingArrays){if(!aQuery)
return null;let stmt=dbStmts.get(aQuery);if(!stmt){log("Creating new statement for query: "+aQuery);stmt=dbConnection.createAsyncStatement(aQuery);dbStmts.set(aQuery,stmt);}
if(aBindingArrays){let bindingArray=aBindingArrays.get(stmt);if(!bindingArray){ bindingArray=stmt.newBindingParamsArray();aBindingArrays.set(stmt,bindingArray);}
if(aParams){let bindingParams=bindingArray.newBindingParams();for(let field in aParams){bindingParams.bindByName(field,aParams[field]);}
bindingArray.addParams(bindingParams);}}else{if(aParams){for(let field in aParams){stmt.params[field]=aParams[field];}}}
return stmt;}
function dbInit(){log("Initializing Database");if(!_dbConnection.tableExists("moz_formhistory")){dbCreate();return;}

let version=_dbConnection.schemaVersion;if(version<3){throw Components.Exception("DB version is unsupported.",Cr.NS_ERROR_FILE_CORRUPTED);}else if(version!=DB_SCHEMA_VERSION){dbMigrate(version);}}
function dbCreate(){log("Creating DB -- tables");for(let name in dbSchema.tables){let table=dbSchema.tables[name];let tSQL=[[col,table[col]].join(" ")for(col in table)].join(", ");log("Creating table "+name+" with "+tSQL);_dbConnection.createTable(name,tSQL);}
log("Creating DB -- indices");for(let name in dbSchema.indices){let index=dbSchema.indices[name];let statement="CREATE INDEX IF NOT EXISTS "+name+" ON "+index.table+"("+index.columns.join(", ")+")";_dbConnection.executeSimpleSQL(statement);}
_dbConnection.schemaVersion=DB_SCHEMA_VERSION;}
function dbMigrate(oldVersion){log("Attempting to migrate from version "+oldVersion);if(oldVersion>DB_SCHEMA_VERSION){log("Downgrading to version "+DB_SCHEMA_VERSION);



if(!dbAreExpectedColumnsPresent()){throw Components.Exception("DB is missing expected columns",Cr.NS_ERROR_FILE_CORRUPTED);}


_dbConnection.schemaVersion=DB_SCHEMA_VERSION;return;}
_dbConnection.beginTransaction();try{for(let v=oldVersion+1;v<=DB_SCHEMA_VERSION;v++){this.log("Upgrading to version "+v+"...");Migrators["dbMigrateToVersion"+v]();}}catch(e){this.log("Migration failed: "+e);this.dbConnection.rollbackTransaction();throw e;}
_dbConnection.schemaVersion=DB_SCHEMA_VERSION;_dbConnection.commitTransaction();log("DB migration completed.");}
var Migrators={dbMigrateToVersion4:function dbMigrateToVersion4(){if(!_dbConnection.tableExists("moz_deleted_formhistory")){let table=dbSchema.tables["moz_deleted_formhistory"];let tSQL=[[col,table[col]].join(" ")for(col in table)].join(", ");_dbConnection.createTable("moz_deleted_formhistory",tSQL);}}};function dbAreExpectedColumnsPresent(){for(let name in dbSchema.tables){let table=dbSchema.tables[name];let query="SELECT "+
[col for(col in table)].join(", ")+" FROM "+name;try{let stmt=_dbConnection.createStatement(query);stmt.finalize();}catch(e){return false;}}
log("verified that expected columns are present in DB.");return true;}
function dbCleanup(dbFile){log("Cleaning up DB file - close & remove & backup"); let backupFile=dbFile.leafName+".corrupt";Services.storage.backupDatabaseFile(dbFile,backupFile);dbClose(false);dbFile.remove(false);}
function dbClose(aShutdown){log("dbClose("+aShutdown+")");if(aShutdown){sendNotification("formhistory-shutdown",null);}

if(!_dbConnection){return;}
log("dbClose finalize statements");for(let stmt of dbStmts.values()){stmt.finalize();}
dbStmts=new Map();let closed=false;_dbConnection.asyncClose(function()closed=true);if(!aShutdown){let thread=Services.tm.currentThread;while(!closed){thread.processNextEvent(true);}}}
function updateFormHistoryWrite(aChanges,aCallbacks){log("updateFormHistoryWrite  "+aChanges.length); let now=Date.now()*1000;

let stmts=[];let notifications=[];let bindingArrays=new Map();for each(let change in aChanges){let operation=change.op;delete change.op;let stmt;switch(operation){case"remove":log("Remove from form history  "+change);let delStmt=makeMoveToDeletedStatement(change.guid,now,change,bindingArrays);if(delStmt&&stmts.indexOf(delStmt)==-1)
stmts.push(delStmt);if("timeDeleted"in change)
delete change.timeDeleted;stmt=makeRemoveStatement(change,bindingArrays);notifications.push(["formhistory-remove",change.guid]);break;case"update":log("Update form history "+change);let guid=change.guid;delete change.guid;
if(change.newGuid){change.guid=change.newGuid
delete change.newGuid;}
stmt=makeUpdateStatement(guid,change,bindingArrays);notifications.push(["formhistory-update",guid]);break;case"bump":log("Bump form history "+change);if(change.guid){stmt=makeBumpStatement(change.guid,now,bindingArrays);notifications.push(["formhistory-update",change.guid]);}else{change.guid=generateGUID();stmt=makeAddStatement(change,now,bindingArrays);notifications.push(["formhistory-add",change.guid]);}
break;case"add":log("Add to form history "+change);change.guid=generateGUID();stmt=makeAddStatement(change,now,bindingArrays);notifications.push(["formhistory-add",change.guid]);break;default: throw Components.Exception("Invalid operation "+operation,Cr.NS_ERROR_ILLEGAL_VALUE);}
if(stmt&&stmts.indexOf(stmt)==-1){stmts.push(stmt);}}
for(let stmt of stmts){stmt.bindParameters(bindingArrays.get(stmt));}
let handlers={handleCompletion:function(aReason){if(aReason==Ci.mozIStorageStatementCallback.REASON_FINISHED){for(let[notification,param]of notifications){sendNotification(notification,param);}}
if(aCallbacks&&aCallbacks.handleCompletion){aCallbacks.handleCompletion(aReason==Ci.mozIStorageStatementCallback.REASON_FINISHED?0:1);}},handleError:function(aError){if(aCallbacks&&aCallbacks.handleError){aCallbacks.handleError(aError);}},handleResult:NOOP};dbConnection.executeAsync(stmts,stmts.length,handlers);}
function expireOldEntriesDeletion(aExpireTime,aBeginningCount){log("expireOldEntriesDeletion("+aExpireTime+","+aBeginningCount+")");FormHistory.update([{op:"remove",lastUsedEnd:aExpireTime,}],{handleCompletion:function(){expireOldEntriesVacuum(aExpireTime,aBeginningCount);},handleError:function(aError){log("expireOldEntriesDeletionFailure");}});}
function expireOldEntriesVacuum(aExpireTime,aBeginningCount){FormHistory.count({},{handleResult:function(aEndingCount){if(aBeginningCount-aEndingCount>500){log("expireOldEntriesVacuum");let stmt=dbCreateAsyncStatement("VACUUM");stmt.executeAsync({handleResult:NOOP,handleError:function(aError){log("expireVacuumError");},handleCompletion:NOOP});}
sendNotification("formhistory-expireoldentries",aExpireTime);},handleError:function(aError){log("expireEndCountFailure");}});}
this.FormHistory={get enabled()Prefs.enabled,search:function formHistorySearch(aSelectTerms,aSearchData,aCallbacks){ aSelectTerms=(aSelectTerms)?aSelectTerms:validFields;validateSearchData(aSearchData,"Search");let stmt=makeSearchStatement(aSearchData,aSelectTerms);let handlers={handleResult:function(aResultSet){let formHistoryFields=dbSchema.tables.moz_formhistory;for(let row=aResultSet.getNextRow();row;row=aResultSet.getNextRow()){let result={};for each(let field in aSelectTerms){result[field]=row.getResultByName(field);}
if(aCallbacks&&aCallbacks.handleResult){aCallbacks.handleResult(result);}}},handleError:function(aError){if(aCallbacks&&aCallbacks.handleError){aCallbacks.handleError(aError);}},handleCompletion:function searchCompletionHandler(aReason){if(aCallbacks&&aCallbacks.handleCompletion){aCallbacks.handleCompletion(aReason==Ci.mozIStorageStatementCallback.REASON_FINISHED?0:1);}}};stmt.executeAsync(handlers);},count:function formHistoryCount(aSearchData,aCallbacks){validateSearchData(aSearchData,"Count");let stmt=makeCountStatement(aSearchData);let handlers={handleResult:function countResultHandler(aResultSet){let row=aResultSet.getNextRow();let count=row.getResultByName("numEntries");if(aCallbacks&&aCallbacks.handleResult){aCallbacks.handleResult(count);}},handleError:function(aError){if(aCallbacks&&aCallbacks.handleError){aCallbacks.handleError(aError);}},handleCompletion:function searchCompletionHandler(aReason){if(aCallbacks&&aCallbacks.handleCompletion){aCallbacks.handleCompletion(aReason==Ci.mozIStorageStatementCallback.REASON_FINISHED?0:1);}}};stmt.executeAsync(handlers);},update:function formHistoryUpdate(aChanges,aCallbacks){if(!Prefs.enabled){return;}

let numSearches=0;let completedSearches=0;let searchFailed=false;function validIdentifier(change){ return Boolean(change.guid)!=Boolean(change.fieldname&&change.value);}
if(!("length"in aChanges))
aChanges=[aChanges];for each(let change in aChanges){switch(change.op){case"remove":validateSearchData(change,"Remove");continue;case"update":if(validIdentifier(change)){validateOpData(change,"Update");if(change.guid){continue;}}else{throw Components.Exception("update op='update' does not correctly reference a entry.",Cr.NS_ERROR_ILLEGAL_VALUE);}
break;case"bump":if(validIdentifier(change)){validateOpData(change,"Bump");if(change.guid){continue;}}else{throw Components.Exception("update op='bump' does not correctly reference a entry.",Cr.NS_ERROR_ILLEGAL_VALUE);}
break;case"add":if(change.guid){throw Components.Exception("op='add' cannot contain field 'guid'. Either use op='update' "+"explicitly or make 'guid' undefined.",Cr.NS_ERROR_ILLEGAL_VALUE);}else if(change.fieldname&&change.value){validateOpData(change,"Add");}
break;default:throw Components.Exception("update does not recognize op='"+change.op+"'",Cr.NS_ERROR_ILLEGAL_VALUE);}
numSearches++;let changeToUpdate=change;FormHistory.search(["guid"],{fieldname:change.fieldname,value:change.value},{foundResult:false,handleResult:function(aResult){if(this.foundResult){log("Database contains multiple entries with the same fieldname/value pair.");if(aCallbacks&&aCallbacks.handleError){aCallbacks.handleError({message:"Database contains multiple entries with the same fieldname/value pair.",result:19
});}
searchFailed=true;return;}
this.foundResult=true;changeToUpdate.guid=aResult["guid"];},handleError:function(aError){if(aCallbacks&&aCallbacks.handleError){aCallbacks.handleError(aError);}},handleCompletion:function(aReason){completedSearches++;if(completedSearches==numSearches){if(!aReason&&!searchFailed){updateFormHistoryWrite(aChanges,aCallbacks);}
else if(aCallbacks&&aCallbacks.handleCompletion){aCallbacks.handleCompletion(1);}}}});}
if(numSearches==0){updateFormHistoryWrite(aChanges,aCallbacks);}},getAutoCompleteResults:function getAutoCompleteResults(searchString,params,aCallbacks){ let searchTokens;let where=""
let boundaryCalc="";if(searchString.length>1){searchTokens=searchString.split(/\s+/); boundaryCalc="MAX(1, :prefixWeight * (value LIKE :valuePrefix ESCAPE '/') + (";
 let tokenCalc=[];let searchTokenCount=Math.min(searchTokens.length,MAX_SEARCH_TOKENS);for(let i=0;i<searchTokenCount;i++){tokenCalc.push("(value LIKE :tokenBegin"+i+" ESCAPE '/') + "+"(value LIKE :tokenBoundary"+i+" ESCAPE '/')");where+="AND (value LIKE :tokenContains"+i+" ESCAPE '/') ";}
 
boundaryCalc+=tokenCalc.join(" + ")+") * :boundaryWeight)";}else if(searchString.length==1){where="AND (value LIKE :valuePrefix ESCAPE '/') ";boundaryCalc="1";delete params.prefixWeight;delete params.boundaryWeight;}else{where="";boundaryCalc="1";delete params.prefixWeight;delete params.boundaryWeight;}
params.now=Date.now()*1000;let query="/* do not warn (bug 496471): can't use an index */ "+"SELECT value, "+"ROUND( "+"timesUsed / MAX(1.0, (lastUsed - firstUsed) / :timeGroupingSize) * "+"MAX(1.0, :maxTimeGroupings - (:now - lastUsed) / :timeGroupingSize) * "+"MAX(1.0, :agedWeight * (firstUsed < :expiryDate)) / "+":bucketSize "+", 3) AS frecency, "+
boundaryCalc+" AS boundaryBonuses "+"FROM moz_formhistory "+"WHERE fieldname=:fieldname "+where+"ORDER BY ROUND(frecency * boundaryBonuses) DESC, UPPER(value) ASC";let stmt=dbCreateAsyncStatement(query,params);
if(searchString.length>=1)
stmt.params.valuePrefix=stmt.escapeStringForLIKE(searchString,"/")+"%";if(searchString.length>1){let searchTokenCount=Math.min(searchTokens.length,MAX_SEARCH_TOKENS);for(let i=0;i<searchTokenCount;i++){let escapedToken=stmt.escapeStringForLIKE(searchTokens[i],"/");stmt.params["tokenBegin"+i]=escapedToken+"%";stmt.params["tokenBoundary"+i]="% "+escapedToken+"%";stmt.params["tokenContains"+i]="%"+escapedToken+"%";}}else{
}
let pending=stmt.executeAsync({handleResult:function(aResultSet){for(let row=aResultSet.getNextRow();row;row=aResultSet.getNextRow()){let value=row.getResultByName("value");let frecency=row.getResultByName("frecency");let entry={text:value,textLowerCase:value.toLowerCase(),frecency:frecency,totalScore:Math.round(frecency*row.getResultByName("boundaryBonuses"))};if(aCallbacks&&aCallbacks.handleResult){aCallbacks.handleResult(entry);}}},handleError:function(aError){if(aCallbacks&&aCallbacks.handleError){aCallbacks.handleError(aError);}},handleCompletion:function(aReason){if(aCallbacks&&aCallbacks.handleCompletion){aCallbacks.handleCompletion(aReason==Ci.mozIStorageStatementCallback.REASON_FINISHED?0:1);}}});return pending;},get schemaVersion(){return dbConnection.schemaVersion;},get _supportsDeletedTable(){return supportsDeletedTable;},set _supportsDeletedTable(val){supportsDeletedTable=val;}, updatePrefs:function updatePrefs(){Prefs.initialized=false;},expireOldEntries:function expireOldEntries(){log("expireOldEntries"); let expireTime=(Date.now()-Prefs.expireDays*DAY_IN_MS)*1000;sendNotification("formhistory-beforeexpireoldentries",expireTime);FormHistory.count({},{handleResult:function(aBeginningCount){expireOldEntriesDeletion(expireTime,aBeginningCount);},handleError:function(aError){log("expireStartCountFailure");}});},shutdown:function shutdown(){dbClose(true);}};Object.freeze(FormHistory);