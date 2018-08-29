const path = require('path')
const shell = require("shelljs")
const jsonld = require("jsonld")
const tmp = require('tmp')
const fs = require('fs')



module.exports = function(){
  return(

  {
  target_dir: this.target_dir,
  catalog_path: this.catalog_path,
  json_ld: this.json_ld,
  json_by_id: this.json_by_id,
  json_by_path: this.json_by_path,
  json_by_type: this.json_by_path,

  generate_bag_info : function generate_bag_info(){
    this.index_graph();
    this.bag_meta = {"BagIt-Profile-Identifier":
       "https://raw.githubusercontent.com/UTS-eResearch/datacrate/master/spec/0.2/profile-datacrate-v0.2.json",
         "DataCrate-Specification-Identifier":
       "https://github.com/UTS-eResearch/datacrate/blob/master/spec/0.2/data_crate_specification_v0.2.md"}

    if (this.root_node["contact"] && this.root_node["contact"]['@id']) {
        contact = this.json_by_id[this.root_node["contact"]['@id']]
        map = {"email": "Contact-Email","phone": "Contact-Telephone", "name": "Contact-Name"}
        for (var [k, v] of Object.entries(map)) {
          if (contact[k]) {
            this.bag_meta[v] = String(contact[k]);
          }
        }

    }
    if(this.root_node["description"]) {
      this.bag_meta["Description"] = this.root_node["description"];
    }

     // Return a hash of BagIt style metadata by looking for it in the JSON-LD structure

   },
   index_graph : function index_graph() {
     //TODO - make this a helper function
     this.catalog_path = path.join(this.target_dir, "CATALOG.json")
     this.json_ld = require(this.catalog_path)
     this.json_by_id = {};
     this.json_by_path = {};
     this.json_by_type = {};
     this.graph =  this.json_ld["@graph"];
     for (let i = 0; i < this.graph.length ; i++) {
       var item = this. graph[i];
       if (item['@id']){
         this.json_by_id[item['@id']] = item;
       }
       if (item['path']){
         this.json_by_path[item['path']] = item;
       }
       if (item['@type']) {
         if (!this.json_by_type[item['@type']]) {
           this.json_by_type[item['@type']] = [];
         }
         this.json_by_type[item['@type']].push(item);
       }

     }
     this.root_node = this.json_by_path["./"] ? this.json_by_path["./"] :  this.json_by_path["data/"];

   },

  save_bag_info : function save_bag_info() {
       var bag_info = "";
       for (var [k, v] of Object.entries(this.bag_meta)) {
         bag_info += k + ": " + v + "\n";

       }
       fs.writeFileSync(path.join(this.target_dir, "bag-info.txt"), bag_info);
  },
  update: function update_bag_tags(){
    shell.exec("bagit updatetagmanifests " +  this.target_dir)
  },
  bag : function bag(source_dir, bag_dir) {
      function fix_paths(catalog_path) {
         console.log(shell.test('-f', catalog_path))
         if(!path.isAbsolute(catalog_path)) {
           catalog_path = path.join("./", catalog_path);
         }
         var catalog = require(catalog_path)
         for (let item of catalog['@graph']) {
           if (item["path"]) {

             if (!Array.isArray(item["path"])) {
                 item["path"] = [item["path"]];
             }
             var p = item["path"][0]
             var new_p = path.join("./data/",  p)

             item["path"] = [new_p]
           }
        

         }
         fs.writeFileSync(catalog_path, JSON.stringify(catalog, null, 2),
          function(err) {
             if(err) {
               return console.log(err, "Error writing in", catalog_path)
             }
         });

      }
      // TODO Generate a list of all files
      // FOR NOW: delete CATALOG.json and index.html
      // Generate bag info later
      var tmpobj = tmp.dirSync()
      console.log('Tempdir: ', tmpobj.name)
      var bag_name = path.basename(source_dir)
      var target_dir = path.join(bag_dir, bag_name)
      shell.cp(path.join(source_dir, "CATALOG.json"), path.join(tmpobj.name, "CATALOG_backup.json"))
      shell.cp(path.join(source_dir, "CATALOG.json"), tmpobj.name)
      shell.rm(path.join(source_dir, "index.html")) // Don't worry, welll make a new one
      shell.exec("bagit create --excludebaginfo " + target_dir + " " + path.join(source_dir, "*"))
      shell.rm(path.join(target_dir, "data", "CATALOG.json"), target_dir)
      shell.exec("bagit update " + target_dir)
      shell.cp(path.join(tmpobj.name, "CATALOG.json"), target_dir)
      shell.cp(path.join(__dirname,'defaults', 'profile-datacrate-v0.2.json'), target_dir)


      fix_paths(path.join(target_dir, "CATALOG.json"))
      this.target_dir = target_dir
      return target_dir
    }




  }
);

}
