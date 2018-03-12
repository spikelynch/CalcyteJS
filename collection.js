var jsonld = require('jsonld');
var fs = require('fs');
var program = require('commander');
var XLSX = require('xlsx');
var path = require('path');
const ignore= /^\./;
const context = require("./defaults/context.json");
const Property = require("./property.js");
const Item = require("./item.js");
const uuidv4 = require('uuid/v4');
const shell = require("shelljs");
var fs = require('fs');
//const catalog_template = require("defaults/catalog_template.html");
const builder = require('xmlbuilder');
const Index = require('./index_html.js');
const Datacite = require('./datacite.js')

module.exports = function(){
  this.collection_metadata = new Item();
  this.children = [];
  this.rel_path = "./";
  this.items = [];
  this.name_lookup = {};
  this.id_lookup = {};
  this.json_ld = {};
  this.field_names_by_type = {};
  this.existing_catalogs = [];


  function get_collection_metadata(workbook, collection) {
    // TODO - make the collection just another kind of item object
    raw_collection_metadata = XLSX.utils.sheet_to_json(workbook.Sheets['Collection']);
    var item_json = {}

    for (var i=0; i < raw_collection_metadata.length ; i++) {
      var name_value = raw_collection_metadata[i];
      item_json[name_value['Name']] =  name_value['Value'];
      }
     item_json["TYPE:"] = "Dataset";
     item_json["path"] = collection.rel_path;
     if (!(collection.rel_path === "./")) {
        //console.log("Setting dataset based on path");
       item_json["ID"] = collection.rel_path;
       //item_json["TYPE:"] = "Dataset";
     } else if (!item_json["ID"]) {
       item_json["ID"] = collection.rel_path;
     }
     collection.collection_metadata.load_json(item_json, collection);
    }

  function get_metadata(workbook, collection, sheet_name) {
    metadata = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name]);
    for (var i=0; i < metadata.length ; i++) {
      item_json = metadata[i];
      //console.log("JSON", item_json)
      item = new Item();
      item.load_json(item_json, collection);
      collection.items.push(item);
    }
  }
  function flattenit(json, collection) {
    var promises = jsonld.promises;
    json["@context"] = context;
    var promise = promises.flatten(json, context); //frame(json, frame);
    return(promise);

}

  return {
    collection_metadata:  this.collection_metadata,
    children: this.children,
    rel_path: this.rel_path,
    dir: this.dir,
    id_lookup: this.id_lookup,
    name_lookup: this.name_lookup,
    items : this.items,
    json_ld : this.json_ld,
    existing_catalogs : this.existing_catalogs,

    get_unique_catalog_name: function get_unique_catalog_name(dir, existing_catalogs= []){
       var index = 0;
       dir = path.basename(dir).replace(" ","_");
       var potential_catalog_filename =`CATALOG_${dir}.xlsx`;
       while (existing_catalogs.includes(potential_catalog_filename)){
           index += 1;
           potential_catalog_filename = `CATALOG_${dir}_${index}.xlsx`;
           //console.log(index, potential_catalog_filename);
         }
         //console.log(index, potential_catalog_filename)
       return potential_catalog_filename;
     },




    to_html : function to_html() {
        var index_maker = new Index();
        index_maker.make_index_html(this.json_ld);
        citer = new Datacite();
        text_citation = citer.make_citation(this.json_ld, path.join(this.dir, "index.html"));
        index_maker.write_html(path.join(__dirname, "defaults/catalog_template.html"), path.join(this.dir, "index.html"), text_citation);
    },

    to_json : function to_json(graph) {
        if (!this.collection_metadata) {
          this.collection_metadata = new Item();
        }
        var collection_json = this.collection_metadata.to_json_ld_fragment();
        graph.push(collection_json);
        //console.log("COLLECTION METADATA", json);
        for (var [key, item] of Object.entries(this.items)) {
          item_json = item.to_json_ld_fragment();
          // Keep track of whether to add this to the graph
          var exists = true;

          //console.log("THINGS", item.id, item.5, item.name)
          if (item.is_file) {

            if (shell.test("-e", path.join(this.root_dir, item.id))) {
              if (!collection_json['hasPart']) {
                 collection_json['hasPart'] = [];
               }
              collection_json['hasPart'].push(
                {
                "@id": item.id
                })
              }
              else {
                exists = false;
              }
            }
           if (exists) {
             graph.push(item_json);
            }
        }
      //Sub collections
      this.children.forEach(function(child)  {
         child.to_json(graph);
         if (!collection_json['hasPart']) {
             collection_json['hasPart'] = [];
           }
          //console.log("Pushing part", child.collection_metadata.id)
          collection_json['hasPart'].push(
            {
            "@id": child.collection_metadata.id
            //"@type": "@id"
          })
        });

    },

    to_json_ld : function to_json_ld() {
    // Turn the entire collection into a JSON-LD document

      json = {
              '@graph'   : [],
              '@context' : context
            };

      this.to_json(json["@graph"]);

      //console.log("JSON", JSON.stringify(json, null, 2));
      json = JSON.parse(JSON.stringify(json));
      //console.log(JSON.stringify(json, null, 2));
      var collection = this;
      promise = flattenit(json, this);
      return promise.then(
        function(flattenated) {
          collection.json_ld = flattenated;
          collection.json_by_id = {};
          collection.json_by_url = {};
          for (let iid = 0; iid < flattenated["@graph"].length; iid++) {
            var item = flattenated["@graph"][iid];
            collection.json_by_id[item["@id"]] = item;
            if (item.path) {
              collection.json_by_url[item.path] = item;
            }
          }
          console.log("Writing in", collection.dir);
          fs.writeFileSync(path.join(collection.dir, "CATALOG.json"), JSON.stringify(flattenated, null, 2),
           function(err) {
              if(err) {
                return console.log(err, "Error wirting in", collection.dir);
              }
           log("The file was saved!" + path.join(collection.dir, "CATALOG.json"));
          });

        },
      function(err) {console.log(err)});

      },
  read : function read(dir, rel_path = "./", parent) {
      //console.log("existing", parent.existing_catalogs)
      if (parent){
        this.parent = parent
        this.name_lookup = parent.name_lookup;
        this.id_lookup = parent.id_lookup;
        this.existing_catalogs = parent.existing_catalogs;
        this.root_dir = parent.root_dir;
        //console.log(this.existing_catalogs);
      }
      else {
        this.name_lookup = {};
        this.id_lookup = {};
        this.existing_catalogs = [];
        this.root_dir = dir;
      }

      this.children = [];
      this.dir = dir;
      this.rel_path = rel_path;
      this.file_info = null;

      //console.log("Lookup tables", this.name_lookup, this.id_lookup);
      //console.log("dir", dir);
      //console.log(('sf -nr -json "' + dir + '"'));

      //console.log("file", JSON.stringify(this.file_info_by_filename, null, 2));
      var items = fs.readdirSync(dir);


      //console.log("These are the items", dir, items);
      if (items) {

        //console.log("ITEMS NOW", items);
        //TODO - make this a testable function
        var catalogs = items.filter(item => /^CATALOG.*xlsx$/.test(item))
        this.existing_catalogs = this.existing_catalogs.concat(catalogs);
        if (catalogs.length > 1) {
          console.log("More than one catalog, using this one: ", catalogs[0])
        }
        items = items.filter(item => !(/^CATALOG.*(xlsx|html|json)$/.test(item)));
        items = items.filter(item => !(/(^index.html$)|(^~)|(^\.)|(datacite.xml)/.test(item)));
        items = items.filter(item => shell.test('-f',path.join(dir, item)));
        //console.log("CATALOGS", catalogs)
        //TODO - make this configurable
        if (catalogs.length  === 0){
          //console.log("Making new catalog");
          var catalog_file = !parent ? "CATALOG.xlsx" : "CATALOG_subdir.xlsx";
          var new_catalog_file = this.get_unique_catalog_name(dir, this.existing_catalogs);
          this.existing_catalogs.push(new_catalog_file);
          //console.log("EXISTING AT THIS POINT", this.existing_catalogs);
          catalogs = [new_catalog_file]
          fs.writeFileSync(path.join(dir, new_catalog_file),
                           fs.readFileSync(path.join(__dirname,"defaults", catalog_file)));
          //console.log("New Catalog", new_catalog_file);
          //COPY IN A NEW CATALOG
          //IF ROOT - use default

          //ELSE sub catalog

        }
        if (catalogs.length  >  0){
            if (items.length < 100) {
              this.file_info = JSON.parse(shell.exec('sf -nr -json "' + dir + '"').stdout);
              //console.log("FILES", JSON.stringify(this.file_info.files, null, 2));
              this.file_info_by_filename = {}
              for(var i = 0; i < this.file_info.files.length; i++) {
                var f = this.file_info.files[i];
                this.file_info_by_filename[f.filename.replace(/.*\//, "")] = f;

                }
              }
          //console.log(dir, catalogs[0]);
          catalog_path = path.join(dir, catalogs[0]);
          this.workbook = XLSX.readFile(catalog_path); //First one found only
          sheet_names = this.workbook.SheetNames;
          for (var i=0; i < sheet_names.length; i++ ) {
            sheet_name = sheet_names[i];
            var sheet = this.workbook.Sheets[sheet_name];
            //console.log(sheet);
            if (sheet_name == "Collection") {
              get_collection_metadata(this.workbook, this);
            } else if (sheet_name == "Files" && this.file_info ) {
              var header_array = XLSX.utils.sheet_to_csv(sheet, options={"header": false});
              //console.log("HEADER ARRAY", header_array.split("\n")[0].split(","));
              var header = header_array.split("\n")[0].split(",");
              //console.log(header);
              sheet_json = XLSX.utils.sheet_to_json(sheet);
              //sheet_json = XLSX.utils.sheet_to_json(this.workbook.Sheets['Files']);
              //console.log("SHEET JSON ORIGINAL", sheet_json);
              sheet_json.forEach(function(row) {
                var f = row["FILE:Filename"];
                if(f) {
                  if (items.includes(f)) {
                    items = items.filter(function(e) { return e !==  f })
                  } else {
                    row["*MISSING-FILE*"] = "1"
                  }
                }

              });
              // items now only contains new files so add them

              items.forEach(function(f){
                sheet_json.push({"FILE:Filename": f});
              })
              // Iterate over items and add files
              //console.log("SHEET_JSON UPDATED", sheet_json);
              //console.log(sheet);

              this.workbook.Sheets['Files'] =  XLSX.utils.json_to_sheet(sheet_json, options ={"header": header});
              XLSX.writeFile(this.workbook, catalog_path);
              //console.log(XLSX.utils.sheet_to_json(this.workbook.Sheets['Files']));
              get_metadata(this.workbook, this, "Files");

              // Write back
            }
            else {
              get_metadata(this.workbook, this, sheet_name);
            }



            //console.log("COLLECTION METADATA:", this.collection_metadata);
          }
        }

        var subdirs = fs.readdirSync(dir).filter(item => (fs.lstatSync(path.join(dir, item)).isDirectory() && !(item.match(ignore)) ));
        //console.log("Subdirs", subdirs)
        if (subdirs.length > 0) {
          for (var i=0; i < subdirs.length; i++) {
            //console.log("Looking at subdirs", subdirs[i]);
            child = new module.exports();
            if (child.read(path.join(dir, subdirs[i]), path.join(this.rel_path, subdirs[i]), this));
            this.existing_catalogs = this.existing_catalogs.concat(child.existing_catalogs);
            this.children.push(child);

        }
        //console.log("NAMES HERE", this.name_lookup);
      }
  }


  }
}

}
