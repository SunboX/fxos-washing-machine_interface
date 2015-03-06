"use strict";module.metadata={"stability":"unstable"};var{Ci}=require("chrome");var method=require("../../method/core");


let getNodeView=method("getNodeView");getNodeView.define(x=>x instanceof Ci.nsIDOMNode?x:x instanceof Ci.nsIDOMWindow?x:null);exports.getNodeView=getNodeView;exports.viewFor=getNodeView;let getActiveView=method("getActiveView");exports.getActiveView=getActiveView;