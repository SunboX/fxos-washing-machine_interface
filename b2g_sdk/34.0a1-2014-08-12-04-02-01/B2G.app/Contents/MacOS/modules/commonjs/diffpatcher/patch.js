"use strict";var method=require("../method/core")
var rebase=require("./rebase")





var patch=method("patch@diffpatcher")
patch.define(Object,function patch(hash,delta){return rebase({},hash,delta)})
module.exports=patch