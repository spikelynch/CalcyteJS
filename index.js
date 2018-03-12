#!/usr/bin/env node
console.log('Hello, world!');
var fs = require('fs');
var program = require('commander');
var XLSX = require('xlsx');
var path = require('path');
const context = require("./defaults/context.json");
const Collection = require("./collection.js")


 program
 .arguments('<dir>')
 .option('-r, --recursive', 'Process sub-directories')
 .action(function(dir){
            var collection = new Collection;
            collection.read(dir, program, is_root = true);
            console.log("METADATA!!!!!!!!!!!!!!!", collection.collection_metadata)
          })
 .parse(process.argv);
