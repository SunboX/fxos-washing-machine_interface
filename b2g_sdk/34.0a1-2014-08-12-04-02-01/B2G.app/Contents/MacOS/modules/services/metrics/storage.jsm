"use strict";this.EXPORTED_SYMBOLS=["DailyValues","MetricsStorageBackend","dateToDays","daysToDate",];const{utils:Cu}=Components;const MILLISECONDS_PER_DAY=24*60*60*1000;Cu.import("resource://gre/modules/Promise.jsm");Cu.import("resource://gre/modules/Sqlite.jsm");Cu.import("resource://gre/modules/AsyncShutdown.jsm");Cu.import("resource://gre/modules/Task.jsm");Cu.import("resource://gre/modules/Log.jsm");Cu.import("resource://services-common/utils.js");function dateToDays(date){return Math.floor(date.getTime()/MILLISECONDS_PER_DAY);}
function daysToDate(days){return new Date(days*MILLISECONDS_PER_DAY);}
this.DailyValues=function(){this._days=new Map();};DailyValues.prototype=Object.freeze({__iterator__:function(){for(let[k,v]of this._days){yield[daysToDate(k),v];}},get size(){return this._days.size;},hasDay:function(date){return this._days.has(dateToDays(date));},getDay:function(date){return this._days.get(dateToDays(date));},setDay:function(date,value){this._days.set(dateToDays(date),value);},appendValue:function(date,value){let key=dateToDays(date);if(this._days.has(key)){return this._days.get(key).push(value);}
this._days.set(key,[value]);},});const SQL={createProvidersTable:"\
CREATE TABLE providers (\
  id INTEGER PRIMARY KEY AUTOINCREMENT, \
  name TEXT, \
  UNIQUE (name) \
)",createProviderStateTable:"\
CREATE TABLE provider_state (\
  id INTEGER PRIMARY KEY AUTOINCREMENT, \
  provider_id INTEGER, \
  name TEXT, \
  VALUE TEXT, \
  UNIQUE (provider_id, name), \
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE\
)",createProviderStateProviderIndex:"\
CREATE INDEX i_provider_state_provider_id ON provider_state (provider_id)",createMeasurementsTable:"\
CREATE TABLE measurements (\
  id INTEGER PRIMARY KEY AUTOINCREMENT, \
  provider_id INTEGER, \
  name TEXT, \
  version INTEGER, \
  UNIQUE (provider_id, name, version), \
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE\
)",createMeasurementsProviderIndex:"\
CREATE INDEX i_measurements_provider_id ON measurements (provider_id)",createMeasurementsView:"\
CREATE VIEW v_measurements AS \
  SELECT \
    providers.id AS provider_id, \
    providers.name AS provider_name, \
    measurements.id AS measurement_id, \
    measurements.name AS measurement_name, \
    measurements.version AS measurement_version \
  FROM providers, measurements \
  WHERE \
    measurements.provider_id = providers.id",createTypesTable:"\
CREATE TABLE types (\
  id INTEGER PRIMARY KEY AUTOINCREMENT, \
  name TEXT, \
  UNIQUE (name)\
)",createFieldsTable:"\
CREATE TABLE fields (\
  id INTEGER PRIMARY KEY AUTOINCREMENT, \
  measurement_id INTEGER, \
  name TEXT, \
  value_type INTEGER , \
  UNIQUE (measurement_id, name), \
  FOREIGN KEY (measurement_id) REFERENCES measurements(id) ON DELETE CASCADE \
  FOREIGN KEY (value_type) REFERENCES types(id) ON DELETE CASCADE \
)",createFieldsMeasurementIndex:"\
CREATE INDEX i_fields_measurement_id ON fields (measurement_id)",createFieldsView:"\
CREATE VIEW v_fields AS \
  SELECT \
    providers.id AS provider_id, \
    providers.name AS provider_name, \
    measurements.id AS measurement_id, \
    measurements.name AS measurement_name, \
    measurements.version AS measurement_version, \
    fields.id AS field_id, \
    fields.name AS field_name, \
    types.id AS type_id, \
    types.name AS type_name \
  FROM providers, measurements, fields, types \
  WHERE \
    fields.measurement_id = measurements.id \
    AND measurements.provider_id = providers.id \
    AND fields.value_type = types.id",createDailyCountersTable:"\
CREATE TABLE daily_counters (\
  field_id INTEGER, \
  day INTEGER, \
  value INTEGER, \
  UNIQUE(field_id, day), \
  FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE\
)",createDailyCountersFieldIndex:"\
CREATE INDEX i_daily_counters_field_id ON daily_counters (field_id)",createDailyCountersDayIndex:"\
CREATE INDEX i_daily_counters_day ON daily_counters (day)",createDailyCountersView:"\
CREATE VIEW v_daily_counters AS SELECT \
  providers.id AS provider_id, \
  providers.name AS provider_name, \
  measurements.id AS measurement_id, \
  measurements.name AS measurement_name, \
  measurements.version AS measurement_version, \
  fields.id AS field_id, \
  fields.name AS field_name, \
  daily_counters.day AS day, \
  daily_counters.value AS value \
FROM providers, measurements, fields, daily_counters \
WHERE \
  daily_counters.field_id = fields.id \
  AND fields.measurement_id = measurements.id \
  AND measurements.provider_id = providers.id",createDailyDiscreteNumericsTable:"\
CREATE TABLE daily_discrete_numeric (\
  id INTEGER PRIMARY KEY AUTOINCREMENT, \
  field_id INTEGER, \
  day INTEGER, \
  value INTEGER, \
  FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE\
)",createDailyDiscreteNumericsFieldIndex:"\
CREATE INDEX i_daily_discrete_numeric_field_id \
ON daily_discrete_numeric (field_id)",createDailyDiscreteNumericsDayIndex:"\
CREATE INDEX i_daily_discrete_numeric_day \
ON daily_discrete_numeric (day)",createDailyDiscreteTextTable:"\
CREATE TABLE daily_discrete_text (\
  id INTEGER PRIMARY KEY AUTOINCREMENT, \
  field_id INTEGER, \
  day INTEGER, \
  value TEXT, \
  FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE\
)",createDailyDiscreteTextFieldIndex:"\
CREATE INDEX i_daily_discrete_text_field_id \
ON daily_discrete_text (field_id)",createDailyDiscreteTextDayIndex:"\
CREATE INDEX i_daily_discrete_text_day \
ON daily_discrete_text (day)",createDailyDiscreteView:"\
CREATE VIEW v_daily_discrete AS \
  SELECT \
    providers.id AS provider_id, \
    providers.name AS provider_name, \
    measurements.id AS measurement_id, \
    measurements.name AS measurement_name, \
    measurements.version AS measurement_version, \
    fields.id AS field_id, \
    fields.name AS field_name, \
    daily_discrete_numeric.id AS value_id, \
    daily_discrete_numeric.day AS day, \
    daily_discrete_numeric.value AS value, \
    \"numeric\" AS value_type \
    FROM providers, measurements, fields, daily_discrete_numeric \
    WHERE \
      daily_discrete_numeric.field_id = fields.id \
      AND fields.measurement_id = measurements.id \
      AND measurements.provider_id = providers.id \
  UNION ALL \
  SELECT \
    providers.id AS provider_id, \
    providers.name AS provider_name, \
    measurements.id AS measurement_id, \
    measurements.name AS measurement_name, \
    measurements.version AS measurement_version, \
    fields.id AS field_id, \
    fields.name AS field_name, \
    daily_discrete_text.id AS value_id, \
    daily_discrete_text.day AS day, \
    daily_discrete_text.value AS value, \
    \"text\" AS value_type \
    FROM providers, measurements, fields, daily_discrete_text \
    WHERE \
      daily_discrete_text.field_id = fields.id \
      AND fields.measurement_id = measurements.id \
      AND measurements.provider_id = providers.id \
  ORDER BY day ASC, value_id ASC",createLastNumericTable:"\
CREATE TABLE last_numeric (\
  field_id INTEGER PRIMARY KEY, \
  day INTEGER, \
  value NUMERIC, \
  FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE\
)",createLastTextTable:"\
CREATE TABLE last_text (\
  field_id INTEGER PRIMARY KEY, \
  day INTEGER, \
  value TEXT, \
  FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE\
)",createLastView:"\
CREATE VIEW v_last AS \
  SELECT \
    providers.id AS provider_id, \
    providers.name AS provider_name, \
    measurements.id AS measurement_id, \
    measurements.name AS measurement_name, \
    measurements.version AS measurement_version, \
    fields.id AS field_id, \
    fields.name AS field_name, \
    last_numeric.day AS day, \
    last_numeric.value AS value, \
    \"numeric\" AS value_type \
    FROM providers, measurements, fields, last_numeric \
    WHERE \
      last_numeric.field_id = fields.id \
      AND fields.measurement_id = measurements.id \
      AND measurements.provider_id = providers.id \
  UNION ALL \
  SELECT \
    providers.id AS provider_id, \
    providers.name AS provider_name, \
    measurements.id AS measurement_id, \
    measurements.name AS measurement_name, \
    measurements.version AS measurement_version, \
    fields.id AS field_id, \
    fields.name AS field_name, \
    last_text.day AS day, \
    last_text.value AS value, \
    \"text\" AS value_type \
    FROM providers, measurements, fields, last_text \
    WHERE \
      last_text.field_id = fields.id \
      AND fields.measurement_id = measurements.id \
      AND measurements.provider_id = providers.id",createDailyLastNumericTable:"\
CREATE TABLE daily_last_numeric (\
  field_id INTEGER, \
  day INTEGER, \
  value NUMERIC, \
  UNIQUE (field_id, day) \
  FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE\
)",createDailyLastNumericFieldIndex:"\
CREATE INDEX i_daily_last_numeric_field_id ON daily_last_numeric (field_id)",createDailyLastNumericDayIndex:"\
CREATE INDEX i_daily_last_numeric_day ON daily_last_numeric (day)",createDailyLastTextTable:"\
CREATE TABLE daily_last_text (\
  field_id INTEGER, \
  day INTEGER, \
  value TEXT, \
  UNIQUE (field_id, day) \
  FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE\
)",createDailyLastTextFieldIndex:"\
CREATE INDEX i_daily_last_text_field_id ON daily_last_text (field_id)",createDailyLastTextDayIndex:"\
CREATE INDEX i_daily_last_text_day ON daily_last_text (day)",createDailyLastView:"\
CREATE VIEW v_daily_last AS \
  SELECT \
    providers.id AS provider_id, \
    providers.name AS provider_name, \
    measurements.id AS measurement_id, \
    measurements.name AS measurement_name, \
    measurements.version AS measurement_version, \
    fields.id AS field_id, \
    fields.name AS field_name, \
    daily_last_numeric.day AS day, \
    daily_last_numeric.value AS value, \
    \"numeric\" as value_type \
    FROM providers, measurements, fields, daily_last_numeric \
    WHERE \
      daily_last_numeric.field_id = fields.id \
      AND fields.measurement_id = measurements.id \
      AND measurements.provider_id = providers.id \
  UNION ALL \
  SELECT \
    providers.id AS provider_id, \
    providers.name AS provider_name, \
    measurements.id AS measurement_id, \
    measurements.name AS measurement_name, \
    measurements.version AS measurement_version, \
    fields.id AS field_id, \
    fields.name AS field_name, \
    daily_last_text.day AS day, \
    daily_last_text.value AS value, \
    \"text\" as value_type \
    FROM providers, measurements, fields, daily_last_text \
    WHERE \
      daily_last_text.field_id = fields.id \
      AND fields.measurement_id = measurements.id \
      AND measurements.provider_id = providers.id",addProvider:"INSERT INTO providers (name) VALUES (:provider)",setProviderState:"\
INSERT OR REPLACE INTO provider_state \
  (provider_id, name, value) \
  VALUES (:provider_id, :name, :value)",addMeasurement:"\
INSERT INTO measurements (provider_id, name, version) \
  VALUES (:provider_id, :measurement, :version)",addType:"INSERT INTO types (name) VALUES (:name)",addField:"\
INSERT INTO fields (measurement_id, name, value_type) \
  VALUES (:measurement_id, :field, :value_type)",incrementDailyCounterFromFieldID:"\
INSERT OR REPLACE INTO daily_counters VALUES (\
  :field_id, \
  :days, \
  COALESCE(\
    (SELECT value FROM daily_counters WHERE \
      field_id = :field_id AND day = :days \
    ), \
    0\
  ) + :by)",deleteLastNumericFromFieldID:"\
DELETE FROM last_numeric WHERE field_id = :field_id",deleteLastTextFromFieldID:"\
DELETE FROM last_text WHERE field_id = :field_id",setLastNumeric:"\
INSERT OR REPLACE INTO last_numeric VALUES (:field_id, :days, :value)",setLastText:"\
INSERT OR REPLACE INTO last_text VALUES (:field_id, :days, :value)",setDailyLastNumeric:"\
INSERT OR REPLACE INTO daily_last_numeric VALUES (:field_id, :days, :value)",setDailyLastText:"\
INSERT OR REPLACE INTO daily_last_text VALUES (:field_id, :days, :value)",addDailyDiscreteNumeric:"\
INSERT INTO daily_discrete_numeric \
(field_id, day, value) VALUES (:field_id, :days, :value)",addDailyDiscreteText:"\
INSERT INTO daily_discrete_text \
(field_id, day, value) VALUES (:field_id, :days, :value)",pruneOldDailyCounters:"DELETE FROM daily_counters WHERE day < :days",pruneOldDailyDiscreteNumeric:"DELETE FROM daily_discrete_numeric WHERE day < :days",pruneOldDailyDiscreteText:"DELETE FROM daily_discrete_text WHERE day < :days",pruneOldDailyLastNumeric:"DELETE FROM daily_last_numeric WHERE day < :days",pruneOldDailyLastText:"DELETE FROM daily_last_text WHERE day < :days",pruneOldLastNumeric:"DELETE FROM last_numeric WHERE day < :days",pruneOldLastText:"DELETE FROM last_text WHERE day < :days",getProviderID:"SELECT id FROM providers WHERE name = :provider",getProviders:"SELECT id, name FROM providers",getProviderStateWithName:"\
SELECT value FROM provider_state \
  WHERE provider_id = :provider_id \
  AND name = :name",getMeasurements:"SELECT * FROM v_measurements",getMeasurementID:"\
SELECT id FROM measurements \
  WHERE provider_id = :provider_id \
    AND name = :measurement \
    AND version = :version",getFieldID:"\
SELECT id FROM fields \
  WHERE measurement_id = :measurement_id \
    AND name = :field \
    AND value_type = :value_type \
",getTypes:"SELECT * FROM types",getTypeID:"SELECT id FROM types WHERE name = :name",getDailyCounterCountsFromFieldID:"\
SELECT day, value FROM daily_counters \
  WHERE field_id = :field_id \
  ORDER BY day ASC",getDailyCounterCountFromFieldID:"\
SELECT value FROM daily_counters \
  WHERE field_id = :field_id \
    AND day = :days",getMeasurementDailyCounters:"\
SELECT field_name, day, value FROM v_daily_counters \
WHERE measurement_id = :measurement_id",getFieldInfo:"SELECT * FROM v_fields",getLastNumericFromFieldID:"\
SELECT day, value FROM last_numeric WHERE field_id = :field_id",getLastTextFromFieldID:"\
SELECT day, value FROM last_text WHERE field_id = :field_id",getMeasurementLastValues:"\
SELECT field_name, day, value FROM v_last \
WHERE measurement_id = :measurement_id",getDailyDiscreteNumericFromFieldID:"\
SELECT day, value FROM daily_discrete_numeric \
  WHERE field_id = :field_id \
  ORDER BY day ASC, id ASC",getDailyDiscreteNumericFromFieldIDAndDay:"\
SELECT day, value FROM daily_discrete_numeric \
  WHERE field_id = :field_id AND day = :days \
  ORDER BY id ASC",getDailyDiscreteTextFromFieldID:"\
SELECT day, value FROM daily_discrete_text \
  WHERE field_id = :field_id \
  ORDER BY day ASC, id ASC",getDailyDiscreteTextFromFieldIDAndDay:"\
SELECT day, value FROM daily_discrete_text \
  WHERE field_id = :field_id AND day = :days \
  ORDER BY id ASC",getMeasurementDailyDiscreteValues:"\
SELECT field_name, day, value_id, value FROM v_daily_discrete \
WHERE measurement_id = :measurement_id \
ORDER BY day ASC, value_id ASC",getDailyLastNumericFromFieldID:"\
SELECT day, value FROM daily_last_numeric \
  WHERE field_id = :field_id \
  ORDER BY day ASC",getDailyLastNumericFromFieldIDAndDay:"\
SELECT day, value FROM daily_last_numeric \
  WHERE field_id = :field_id AND day = :days",getDailyLastTextFromFieldID:"\
SELECT day, value FROM daily_last_text \
  WHERE field_id = :field_id \
  ORDER BY day ASC",getDailyLastTextFromFieldIDAndDay:"\
SELECT day, value FROM daily_last_text \
  WHERE field_id = :field_id AND day = :days",getMeasurementDailyLastValues:"\
SELECT field_name, day, value FROM v_daily_last \
WHERE measurement_id = :measurement_id",};function dailyKeyFromDate(date){let year=String(date.getUTCFullYear());let month=String(date.getUTCMonth()+1);let day=String(date.getUTCDate());if(month.length<2){month="0"+month;}
if(day.length<2){day="0"+day;}
return year+"-"+month+"-"+day;}
this.MetricsStorageBackend=function(path){return Task.spawn(function initTask(){let connection=yield Sqlite.openConnection({path:path,
sharedMemoryCache:false,});
let storage;try{storage=new MetricsStorageSqliteBackend(connection);yield storage._init();}catch(ex){yield connection.close();throw ex;}
throw new Task.Result(storage);});};

let shutdown=new AsyncShutdown.Barrier("Metrics Storage Backend");this.MetricsStorageBackend.shutdown=shutdown.client;Sqlite.shutdown.addBlocker("Metrics Storage: Shutting down",()=>shutdown.wait());function MetricsStorageSqliteBackend(connection){this._log=Log.repository.getLogger("Services.Metrics.MetricsStorage");this._connection=connection;this._enabledWALCheckpointPages=null;this._typesByID=new Map();this._typesByName=new Map();this._providerIDs=new Map();this._measurementsByInfo=new Map();this._measurementsByID=new Map();this._fieldsByID=new Map();this._fieldsByInfo=new Map();this._fieldsByMeasurement=new Map();this._queuedOperations=[];this._queuedInProgress=false;}
MetricsStorageSqliteBackend.prototype=Object.freeze({



MAX_WAL_SIZE_KB:512,FIELD_DAILY_COUNTER:"daily-counter",FIELD_DAILY_DISCRETE_NUMERIC:"daily-discrete-numeric",FIELD_DAILY_DISCRETE_TEXT:"daily-discrete-text",FIELD_DAILY_LAST_NUMERIC:"daily-last-numeric",FIELD_DAILY_LAST_TEXT:"daily-last-text",FIELD_LAST_NUMERIC:"last-numeric",FIELD_LAST_TEXT:"last-text",_BUILTIN_TYPES:["FIELD_DAILY_COUNTER","FIELD_DAILY_DISCRETE_NUMERIC","FIELD_DAILY_DISCRETE_TEXT","FIELD_DAILY_LAST_NUMERIC","FIELD_DAILY_LAST_TEXT","FIELD_LAST_NUMERIC","FIELD_LAST_TEXT",],_SCHEMA_STATEMENTS:["createProvidersTable","createProviderStateTable","createProviderStateProviderIndex","createMeasurementsTable","createMeasurementsProviderIndex","createMeasurementsView","createTypesTable","createFieldsTable","createFieldsMeasurementIndex","createFieldsView","createDailyCountersTable","createDailyCountersFieldIndex","createDailyCountersDayIndex","createDailyCountersView","createDailyDiscreteNumericsTable","createDailyDiscreteNumericsFieldIndex","createDailyDiscreteNumericsDayIndex","createDailyDiscreteTextTable","createDailyDiscreteTextFieldIndex","createDailyDiscreteTextDayIndex","createDailyDiscreteView","createDailyLastNumericTable","createDailyLastNumericFieldIndex","createDailyLastNumericDayIndex","createDailyLastTextTable","createDailyLastTextFieldIndex","createDailyLastTextDayIndex","createDailyLastView","createLastNumericTable","createLastTextTable","createLastView",],_PRUNE_STATEMENTS:["pruneOldDailyCounters","pruneOldDailyDiscreteNumeric","pruneOldDailyDiscreteText","pruneOldDailyLastNumeric","pruneOldDailyLastText","pruneOldLastNumeric","pruneOldLastText",],close:function(){return Task.spawn(function doClose(){



try{yield this.enqueueOperation(function dummyOperation(){return this._connection.execute("SELECT 1");}.bind(this));}catch(ex){}
try{yield this._connection.close();}finally{this._connection=null;}}.bind(this));},hasProvider:function(provider){return this._providerIDs.has(provider);},hasMeasurement:function(provider,name,version){return this._measurementsByInfo.has([provider,name,version].join(":"));},hasFieldFromMeasurement:function(measurementID,field){return this._fieldsByInfo.has([measurementID,field].join(":"));},hasField:function(provider,measurement,version,field){let key=[provider,measurement,version].join(":");let measurementID=this._measurementsByInfo.get(key);if(!measurementID){return false;}
return this.hasFieldFromMeasurement(measurementID,field);},providerID:function(provider){return this._providerIDs.get(provider);},measurementID:function(provider,measurement,version){return this._measurementsByInfo.get([provider,measurement,version].join(":"));},fieldIDFromMeasurement:function(measurementID,field){return this._fieldsByInfo.get([measurementID,field].join(":"));},fieldID:function(provider,measurement,version,field){let measurementID=this.measurementID(provider,measurement,version);if(!measurementID){return null;}
return this.fieldIDFromMeasurement(measurementID,field);},measurementHasAnyDailyCounterFields:function(measurementID){return this.measurementHasAnyFieldsOfTypes(measurementID,[this.FIELD_DAILY_COUNTER]);},measurementHasAnyLastFields:function(measurementID){return this.measurementHasAnyFieldsOfTypes(measurementID,[this.FIELD_LAST_NUMERIC,this.FIELD_LAST_TEXT]);},measurementHasAnyDailyLastFields:function(measurementID){return this.measurementHasAnyFieldsOfTypes(measurementID,[this.FIELD_DAILY_LAST_NUMERIC,this.FIELD_DAILY_LAST_TEXT]);},measurementHasAnyDailyDiscreteFields:function(measurementID){return this.measurementHasAnyFieldsOfTypes(measurementID,[this.FIELD_DAILY_DISCRETE_NUMERIC,this.FIELD_DAILY_DISCRETE_TEXT]);},measurementHasAnyFieldsOfTypes:function(measurementID,types){if(!this._fieldsByMeasurement.has(measurementID)){return false;}
let fieldIDs=this._fieldsByMeasurement.get(measurementID);for(let fieldID of fieldIDs){let fieldType=this._fieldsByID.get(fieldID)[2];if(types.indexOf(fieldType)!=-1){return true;}}
return false;},registerMeasurement:function(provider,name,version){if(this.hasMeasurement(provider,name,version)){return CommonUtils.laterTickResolvingPromise(this.measurementID(provider,name,version));}

let self=this;return this.enqueueOperation(function createMeasurementOperation(){return Task.spawn(function createMeasurement(){let providerID=self._providerIDs.get(provider);if(!providerID){yield self._connection.executeCached(SQL.addProvider,{provider:provider});let rows=yield self._connection.executeCached(SQL.getProviderID,{provider:provider});providerID=rows[0].getResultByIndex(0);self._providerIDs.set(provider,providerID);}
let params={provider_id:providerID,measurement:name,version:version,};yield self._connection.executeCached(SQL.addMeasurement,params);let rows=yield self._connection.executeCached(SQL.getMeasurementID,params);let measurementID=rows[0].getResultByIndex(0);self._measurementsByInfo.set([provider,name,version].join(":"),measurementID);self._measurementsByID.set(measurementID,[provider,name,version]);self._fieldsByMeasurement.set(measurementID,new Set());throw new Task.Result(measurementID);});});},registerField:function(measurementID,field,valueType){if(!valueType){throw new Error("Value type must be defined.");}
if(!this._measurementsByID.has(measurementID)){throw new Error("Measurement not known: "+measurementID);}
if(!this._typesByName.has(valueType)){throw new Error("Unknown value type: "+valueType);}
let typeID=this._typesByName.get(valueType);if(!typeID){throw new Error("Undefined type: "+valueType);}
if(this.hasFieldFromMeasurement(measurementID,field)){let id=this.fieldIDFromMeasurement(measurementID,field);let existingType=this._fieldsByID.get(id)[2];if(valueType!=existingType){throw new Error("Field already defined with different type: "+existingType);}
return CommonUtils.laterTickResolvingPromise(this.fieldIDFromMeasurement(measurementID,field));}
let self=this;return Task.spawn(function createField(){let params={measurement_id:measurementID,field:field,value_type:typeID,};yield self._connection.executeCached(SQL.addField,params);let rows=yield self._connection.executeCached(SQL.getFieldID,params);let fieldID=rows[0].getResultByIndex(0);self._fieldsByID.set(fieldID,[measurementID,field,valueType]);self._fieldsByInfo.set([measurementID,field].join(":"),fieldID);self._fieldsByMeasurement.get(measurementID).add(fieldID);throw new Task.Result(fieldID);});},_init:function(){let self=this;return Task.spawn(function initTask(){
let rows=yield self._connection.execute("PRAGMA page_size");let pageSize=1024;if(rows.length){pageSize=rows[0].getResultByIndex(0);}
self._log.debug("Page size is "+pageSize);yield self._connection.execute("PRAGMA temp_store=MEMORY");let journalMode;rows=yield self._connection.execute("PRAGMA journal_mode=WAL");if(rows.length){journalMode=rows[0].getResultByIndex(0);}
self._log.info("Journal mode is "+journalMode);if(journalMode=="wal"){self._enabledWALCheckpointPages=Math.ceil(self.MAX_WAL_SIZE_KB*1024/pageSize);self._log.info("WAL auto checkpoint pages: "+
self._enabledWALCheckpointPages);
yield self.setAutoCheckpoint(0);}else{if(journalMode!="truncate"){yield self._connection.execute("PRAGMA journal_mode=TRUNCATE");}

yield self._connection.execute("PRAGMA synchronous=FULL");}
let doCheckpoint=false;yield self._connection.executeTransaction(function ensureSchema(conn){let schema=yield conn.getSchemaVersion();if(schema==0){self._log.info("Creating database schema.");for(let k of self._SCHEMA_STATEMENTS){yield self._connection.execute(SQL[k]);}
yield self._connection.setSchemaVersion(1);doCheckpoint=true;}else if(schema!=1){throw new Error("Unknown database schema: "+schema);}else{self._log.debug("Database schema up to date.");}});yield self._connection.execute(SQL.getTypes,null,function onRow(row){let id=row.getResultByName("id");let name=row.getResultByName("name");self._typesByID.set(id,name);self._typesByName.set(name,id);});let missingTypes=[];for(let type of self._BUILTIN_TYPES){type=self[type];if(self._typesByName.has(type)){continue;}
missingTypes.push(type);}
if(missingTypes.length){yield self._connection.executeTransaction(function populateBuiltinTypes(){for(let type of missingTypes){let params={name:type};yield self._connection.executeCached(SQL.addType,params);let rows=yield self._connection.executeCached(SQL.getTypeID,params);let id=rows[0].getResultByIndex(0);self._typesByID.set(id,type);self._typesByName.set(type,id);}});doCheckpoint=true;}
yield self._connection.execute(SQL.getMeasurements,null,function onRow(row){let providerID=row.getResultByName("provider_id");let providerName=row.getResultByName("provider_name");let measurementID=row.getResultByName("measurement_id");let measurementName=row.getResultByName("measurement_name");let measurementVersion=row.getResultByName("measurement_version");self._providerIDs.set(providerName,providerID);let info=[providerName,measurementName,measurementVersion].join(":");self._measurementsByInfo.set(info,measurementID);self._measurementsByID.set(measurementID,info);self._fieldsByMeasurement.set(measurementID,new Set());});yield self._connection.execute(SQL.getFieldInfo,null,function onRow(row){let measurementID=row.getResultByName("measurement_id");let fieldID=row.getResultByName("field_id");let fieldName=row.getResultByName("field_name");let typeName=row.getResultByName("type_name");self._fieldsByID.set(fieldID,[measurementID,fieldName,typeName]);self._fieldsByInfo.set([measurementID,fieldName].join(":"),fieldID);self._fieldsByMeasurement.get(measurementID).add(fieldID);});
if(doCheckpoint){yield self.checkpoint();}
yield self.setAutoCheckpoint(1);});},pruneDataBefore:function(date){let statements=this._PRUNE_STATEMENTS;let self=this;return this.enqueueOperation(function doPrune(){return self._connection.executeTransaction(function prune(conn){let days=dateToDays(date);let params={days:days};for(let name of statements){yield conn.execute(SQL[name],params);}});});},compact:function(){let self=this;return this.enqueueOperation(function doCompact(){self._connection.discardCachedStatements();return self._connection.shrinkMemory();});},checkpoint:function(){if(!this._enabledWALCheckpointPages){return CommonUtils.laterTickResolvingPromise();}
return this.enqueueOperation(function checkpoint(){this._log.info("Performing manual WAL checkpoint.");return this._connection.execute("PRAGMA wal_checkpoint");}.bind(this));},setAutoCheckpoint:function(on){
if(!this._enabledWALCheckpointPages){return CommonUtils.laterTickResolvingPromise();}
let val=on?this._enabledWALCheckpointPages:0;return this.enqueueOperation(function setWALCheckpoint(){this._log.info("Setting WAL auto checkpoint to "+val);return this._connection.execute("PRAGMA wal_autocheckpoint="+val);}.bind(this));},_ensureFieldType:function(id,type){let info=this._fieldsByID.get(id);if(!info||!Array.isArray(info)){throw new Error("Unknown field ID: "+id);}
if(type!=info[2]){throw new Error("Field type does not match the expected for this "+"operation. Actual: "+info[2]+"; Expected: "+
type);}},enqueueOperation:function(func){if(typeof(func)!="function"){throw new Error("enqueueOperation expects a function. Got: "+typeof(func));}
this._log.trace("Enqueueing operation.");let deferred=Promise.defer();this._queuedOperations.push([func,deferred]);if(this._queuedOperations.length==1){this._popAndPerformQueuedOperation();}
return deferred.promise;},enqueueTransaction:function(func,type){return this.enqueueOperation(this._connection.executeTransaction.bind(this._connection,func,type));},_popAndPerformQueuedOperation:function(){if(!this._queuedOperations.length||this._queuedInProgress){return;}
this._log.trace("Performing queued operation.");let[func,deferred]=this._queuedOperations.shift();let promise;try{this._queuedInProgress=true;promise=func();}catch(ex){this._log.warn("Queued operation threw during execution: "+
CommonUtils.exceptionStr(ex));this._queuedInProgress=false;deferred.reject(ex);this._popAndPerformQueuedOperation();return;}
if(!promise||typeof(promise.then)!="function"){let msg="Queued operation did not return a promise: "+func;this._log.warn(msg);this._queuedInProgress=false;deferred.reject(new Error(msg));this._popAndPerformQueuedOperation();return;}
promise.then(function onSuccess(result){this._log.trace("Queued operation completed.");this._queuedInProgress=false;deferred.resolve(result);this._popAndPerformQueuedOperation();}.bind(this),function onError(error){this._log.warn("Failure when performing queued operation: "+
CommonUtils.exceptionStr(error));this._queuedInProgress=false;deferred.reject(error);this._popAndPerformQueuedOperation();}.bind(this));},getMeasurementValues:function(id){let deferred=Promise.defer();let days=new DailyValues();let singular=new Map();let self=this;this.enqueueOperation(function enqueuedGetMeasurementValues(){return Task.spawn(function fetchMeasurementValues(){function handleResult(data){for(let[field,values]of data){for(let[day,value]of Iterator(values)){if(!days.hasDay(day)){days.setDay(day,new Map());}
days.getDay(day).set(field,value);}}}
if(self.measurementHasAnyDailyCounterFields(id)){let counters=yield self.getMeasurementDailyCountersFromMeasurementID(id);handleResult(counters);}
if(self.measurementHasAnyDailyLastFields(id)){let dailyLast=yield self.getMeasurementDailyLastValuesFromMeasurementID(id);handleResult(dailyLast);}
if(self.measurementHasAnyDailyDiscreteFields(id)){let dailyDiscrete=yield self.getMeasurementDailyDiscreteValuesFromMeasurementID(id);handleResult(dailyDiscrete);}
if(self.measurementHasAnyLastFields(id)){let last=yield self.getMeasurementLastValuesFromMeasurementID(id);for(let[field,value]of last){singular.set(field,value);}}});}).then(function onSuccess(){deferred.resolve({singular:singular,days:days});},function onError(error){deferred.reject(error);});return deferred.promise;},




setProviderState:function(provider,key,value){if(typeof(key)!="string"){throw new Error("State key must be a string. Got: "+key);}
if(typeof(value)!="string"){throw new Error("State value must be a string. Got: "+value);}
let id=this.providerID(provider);if(!id){throw new Error("Unknown provider: "+provider);}
return this._connection.executeCached(SQL.setProviderState,{provider_id:id,name:key,value:value,});},getProviderState:function(provider,key){let id=this.providerID(provider);if(!id){throw new Error("Unknown provider: "+provider);}
let conn=this._connection;return Task.spawn(function queryDB(){let rows=yield conn.executeCached(SQL.getProviderStateWithName,{provider_id:id,name:key,});if(!rows.length){throw new Task.Result(null);}
throw new Task.Result(rows[0].getResultByIndex(0));});},incrementDailyCounterFromFieldID:function(id,date=new Date(),by=1){this._ensureFieldType(id,this.FIELD_DAILY_COUNTER);let params={field_id:id,days:dateToDays(date),by:by,};return this._connection.executeCached(SQL.incrementDailyCounterFromFieldID,params);},getDailyCounterCountsFromFieldID:function(id){this._ensureFieldType(id,this.FIELD_DAILY_COUNTER);let self=this;return Task.spawn(function fetchCounterDays(){let rows=yield self._connection.executeCached(SQL.getDailyCounterCountsFromFieldID,{field_id:id});let result=new DailyValues();for(let row of rows){let days=row.getResultByIndex(0);let counter=row.getResultByIndex(1);let date=daysToDate(days);result.setDay(date,counter);}
throw new Task.Result(result);});},getDailyCounterCountFromFieldID:function(field,date){this._ensureFieldType(field,this.FIELD_DAILY_COUNTER);let params={field_id:field,days:dateToDays(date),};let self=this;return Task.spawn(function fetchCounter(){let rows=yield self._connection.executeCached(SQL.getDailyCounterCountFromFieldID,params);if(!rows.length){throw new Task.Result(null);}
throw new Task.Result(rows[0].getResultByIndex(0));});},setLastNumericFromFieldID:function(fieldID,value,date=new Date()){this._ensureFieldType(fieldID,this.FIELD_LAST_NUMERIC);if(typeof(value)!="number"){throw new Error("Value is not a number: "+value);}
let params={field_id:fieldID,days:dateToDays(date),value:value,};return this._connection.executeCached(SQL.setLastNumeric,params);},setLastTextFromFieldID:function(fieldID,value,date=new Date()){this._ensureFieldType(fieldID,this.FIELD_LAST_TEXT);if(typeof(value)!="string"){throw new Error("Value is not a string: "+value);}
let params={field_id:fieldID,days:dateToDays(date),value:value,};return this._connection.executeCached(SQL.setLastText,params);},getLastNumericFromFieldID:function(fieldID){this._ensureFieldType(fieldID,this.FIELD_LAST_NUMERIC);let self=this;return Task.spawn(function fetchLastField(){let rows=yield self._connection.executeCached(SQL.getLastNumericFromFieldID,{field_id:fieldID});if(!rows.length){throw new Task.Result(null);}
let row=rows[0];let days=row.getResultByIndex(0);let value=row.getResultByIndex(1);throw new Task.Result([daysToDate(days),value]);});},getLastTextFromFieldID:function(fieldID){this._ensureFieldType(fieldID,this.FIELD_LAST_TEXT);let self=this;return Task.spawn(function fetchLastField(){let rows=yield self._connection.executeCached(SQL.getLastTextFromFieldID,{field_id:fieldID});if(!rows.length){throw new Task.Result(null);}
let row=rows[0];let days=row.getResultByIndex(0);let value=row.getResultByIndex(1);throw new Task.Result([daysToDate(days),value]);});},deleteLastNumericFromFieldID:function(fieldID){this._ensureFieldType(fieldID,this.FIELD_LAST_NUMERIC);return this._connection.executeCached(SQL.deleteLastNumericFromFieldID,{field_id:fieldID});},deleteLastTextFromFieldID:function(fieldID){this._ensureFieldType(fieldID,this.FIELD_LAST_TEXT);return this._connection.executeCached(SQL.deleteLastTextFromFieldID,{field_id:fieldID});},setDailyLastNumericFromFieldID:function(fieldID,value,date=new Date()){this._ensureFieldType(fieldID,this.FIELD_DAILY_LAST_NUMERIC);let params={field_id:fieldID,days:dateToDays(date),value:value,};return this._connection.executeCached(SQL.setDailyLastNumeric,params);},setDailyLastTextFromFieldID:function(fieldID,value,date=new Date()){this._ensureFieldType(fieldID,this.FIELD_DAILY_LAST_TEXT);let params={field_id:fieldID,days:dateToDays(date),value:value,};return this._connection.executeCached(SQL.setDailyLastText,params);},getDailyLastNumericFromFieldID:function(fieldID,date=null){this._ensureFieldType(fieldID,this.FIELD_DAILY_LAST_NUMERIC);let params={field_id:fieldID};let name="getDailyLastNumericFromFieldID";if(date){params.days=dateToDays(date);name="getDailyLastNumericFromFieldIDAndDay";}
return this._getDailyLastFromFieldID(name,params);},getDailyLastTextFromFieldID:function(fieldID,date=null){this._ensureFieldType(fieldID,this.FIELD_DAILY_LAST_TEXT);let params={field_id:fieldID};let name="getDailyLastTextFromFieldID";if(date){params.days=dateToDays(date);name="getDailyLastTextFromFieldIDAndDay";}
return this._getDailyLastFromFieldID(name,params);},_getDailyLastFromFieldID:function(name,params){let self=this;return Task.spawn(function fetchDailyLastForField(){let rows=yield self._connection.executeCached(SQL[name],params);let result=new DailyValues();for(let row of rows){let d=daysToDate(row.getResultByIndex(0));let value=row.getResultByIndex(1);result.setDay(d,value);}
throw new Task.Result(result);});},addDailyDiscreteNumericFromFieldID:function(fieldID,value,date=new Date()){this._ensureFieldType(fieldID,this.FIELD_DAILY_DISCRETE_NUMERIC);if(typeof(value)!="number"){throw new Error("Number expected. Got: "+value);}
let params={field_id:fieldID,days:dateToDays(date),value:value,};return this._connection.executeCached(SQL.addDailyDiscreteNumeric,params);},addDailyDiscreteTextFromFieldID:function(fieldID,value,date=new Date()){this._ensureFieldType(fieldID,this.FIELD_DAILY_DISCRETE_TEXT);if(typeof(value)!="string"){throw new Error("String expected. Got: "+value);}
let params={field_id:fieldID,days:dateToDays(date),value:value,};return this._connection.executeCached(SQL.addDailyDiscreteText,params);},getDailyDiscreteNumericFromFieldID:function(fieldID,date=null){this._ensureFieldType(fieldID,this.FIELD_DAILY_DISCRETE_NUMERIC);let params={field_id:fieldID};let name="getDailyDiscreteNumericFromFieldID";if(date){params.days=dateToDays(date);name="getDailyDiscreteNumericFromFieldIDAndDay";}
return this._getDailyDiscreteFromFieldID(name,params);},getDailyDiscreteTextFromFieldID:function(fieldID,date=null){this._ensureFieldType(fieldID,this.FIELD_DAILY_DISCRETE_TEXT);let params={field_id:fieldID};let name="getDailyDiscreteTextFromFieldID";if(date){params.days=dateToDays(date);name="getDailyDiscreteTextFromFieldIDAndDay";}
return this._getDailyDiscreteFromFieldID(name,params);},_getDailyDiscreteFromFieldID:function(name,params){let self=this;return Task.spawn(function fetchDailyDiscreteValuesForField(){let rows=yield self._connection.executeCached(SQL[name],params);let result=new DailyValues();for(let row of rows){let d=daysToDate(row.getResultByIndex(0));let value=row.getResultByIndex(1);result.appendValue(d,value);}
throw new Task.Result(result);});},getMeasurementDailyCountersFromMeasurementID:function(id){let self=this;return Task.spawn(function fetchDailyCounters(){let rows=yield self._connection.execute(SQL.getMeasurementDailyCounters,{measurement_id:id});let result=new Map();for(let row of rows){let field=row.getResultByName("field_name");let date=daysToDate(row.getResultByName("day"));let value=row.getResultByName("value");if(!result.has(field)){result.set(field,new DailyValues());}
result.get(field).setDay(date,value);}
throw new Task.Result(result);});},getMeasurementLastValuesFromMeasurementID:function(id){let self=this;return Task.spawn(function fetchMeasurementLastValues(){let rows=yield self._connection.execute(SQL.getMeasurementLastValues,{measurement_id:id});let result=new Map();for(let row of rows){let date=daysToDate(row.getResultByIndex(1));let value=row.getResultByIndex(2);result.set(row.getResultByIndex(0),[date,value]);}
throw new Task.Result(result);});},getMeasurementDailyLastValuesFromMeasurementID:function(id){let self=this;return Task.spawn(function fetchMeasurementDailyLastValues(){let rows=yield self._connection.execute(SQL.getMeasurementDailyLastValues,{measurement_id:id});let result=new Map();for(let row of rows){let field=row.getResultByName("field_name");let date=daysToDate(row.getResultByName("day"));let value=row.getResultByName("value");if(!result.has(field)){result.set(field,new DailyValues());}
result.get(field).setDay(date,value);}
throw new Task.Result(result);});},getMeasurementDailyDiscreteValuesFromMeasurementID:function(id){let deferred=Promise.defer();let result=new Map();this._connection.execute(SQL.getMeasurementDailyDiscreteValues,{measurement_id:id},function onRow(row){let field=row.getResultByName("field_name");let date=daysToDate(row.getResultByName("day"));let value=row.getResultByName("value");if(!result.has(field)){result.set(field,new DailyValues());}
result.get(field).appendValue(date,value);}).then(function onComplete(){deferred.resolve(result);},function onError(error){deferred.reject(error);});return deferred.promise;},});for(let property of MetricsStorageSqliteBackend.prototype._BUILTIN_TYPES){this.MetricsStorageBackend[property]=MetricsStorageSqliteBackend.prototype[property];}