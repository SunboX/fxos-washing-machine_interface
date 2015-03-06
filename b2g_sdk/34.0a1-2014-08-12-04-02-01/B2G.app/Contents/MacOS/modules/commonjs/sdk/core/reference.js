"use strict";module.metadata={"stability":"experimental"};const method=require("../../method/core");const{Class}=require("./heritage");
const WeakReference=Class({});exports.WeakReference=WeakReference;


const isWeak=method("reference/weak?");exports.isWeak=isWeak;isWeak.define(Object,_=>false);isWeak.define(WeakReference,_=>true);