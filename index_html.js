const builder = require('xmlbuilder');
var fs = require('fs');
var ejs = require('ejs');
context = require('./defaults/context.json');
const path = require('path');
const shell = require("shelljs");
const jsonld = require("jsonld");

// TODO - Put this in a utility function
const arrayify = function arrayify(something, callback) {
  if (!Array.isArray(something)){
      something = [something]
    }
  return callback(something)
}


module.exports = function(){
  return(
  {
    write_html : function write_html(template_path, out_path, citation_text, zip_path) {
    //
    this.out_path = out_path;
    var zip_link = zip_path ? "<a href='" + zip_path + "'>Download a zip file</a>" : ""
    var temp = fs.readFileSync(template_path, { encoding: 'utf8' });
    var template = ejs.compile(temp);
    this.html = template({html: this.html_el.end({ pretty: true, allowEmpty: true}), citation: citation_text, zip_link: zip_link});
    if (out_path) {
      fs.writeFileSync(out_path, this.html);
    }

  },
  sort_keys : function(keys) {
    // Sort a set or array of keys to be in the same order as those in context.json
    // Returns set
    keys = new Set(keys);
    return new Set(Object.keys(context).filter(function (k){return keys.has(k)}))
  },

  items_to_html : function items_to_html(node, html, toc) {
      var table_el = html.ele("table").att("class", "table table-striped");
      // Find all the keys
      keys = [];
      for (let [_, f] of Object.entries(node)) {
        keys = keys.concat(Object.keys(f));
      }
      key_set = this.sort_keys(keys);

      key_set.delete('@type');
      key_set.delete('@id');
      key_set.delete('identifier');
      key_set.delete('fileFormat');
      var thead_l = table_el.ele("thead").att("class","thead-inverse");
      var header_row_el = thead_l.ele("tr");
      for (let k of key_set) {
        header_row_el.ele("th", k[0].toUpperCase() + k.substring(1));
      }
      body_el = table_el.ele("tbody").att("class","table-striped");
      for (let [_, property] of Object.entries(node)) {
        var row_el = table_el.ele("tr").att("id", property['@id']);
        for (let key of key_set) {
          td_ele = row_el.ele("td");

          this.format_cell(property, key, td_ele);

        }

        }
      },


  format_cell : function(f, k, td_ele) {
    var data = f[k];
    if (!Array.isArray(data)) {
        data = [data];
    }
    var i = 0;
    for (let part of data) {
      //console.log("PART", part)
      if (part === undefined) {

      } else if (k === 'name' && f["@id"].match(/^https?:\/\//i)) {
        td_ele.ele("a", part).att('href', f["@id"]).att('class', 'fa fa-external-link');
      } else if (k === 'path') {
        td_ele.ele("a", part.replace(/\/$/,"").split('/').pop()).att('href', part) ;
      } else if (k === 'encodingFormat' && f.fileFormat && f.fileFormat.match(/^https?:\/\//i)){
        td_ele.ele("a", part).att('href', f.fileFormat);
      } else if (
        (k != "hasPart") &&
        this.json_by_id[part['@id']] &&
        !(this.json_by_id[part['@id']].name || this.json_by_id[part['@id']].description)) {
        // Embed small bits of info that don't have a name or description
        this.dataset_to_html(this.json_by_id[part['@id']], td_ele);
      } else if (part['@id'] && this.json_by_id[part['@id']]) {
        var target_name = this.json_by_id[part['@id']].name ? this.json_by_id[part['@id']].name : part['@id'];
        link_ele = td_ele.ele('a')
        link_ele.att('href', '#' + part['@id']);
        link_ele.txt(target_name)

      }
      else {
        td_ele.txt(part);
      }
      i++;
      if (i < data.length) {
        td_ele.txt(", ");
      }
    }
  },

  dataset_to_html : function dataset_to_html(node, html, toc, out_path) {
    header = html.ele("hr")

    var table_el = html.ele("table").att("class", "table")
    if (node["@id"]) {
       table_el.att("id", node["@id"]);
     }

    var keys = new Set(Object.keys(node));
    table_el.ele("th").ele("h4","Type")
    if (node["@type"])
     {table_el.ele("td").ele("h4",)}

    keys.delete("@id");
    keys.delete("identifier");
    keys.delete("@type");
    var row_el = table_el.ele("tr")

    //keys.delete("hasPart");
    key = this.sort_keys(keys);
    for (let key of keys) {
      var value = node[key];
      var row_el = table_el.ele("tr")
      el = row_el.ele("th")
      if (context[key]){
        // TODO deal with more complex case by using JSON-LD library
        el = el.ele("a").att("class", "fa fa-external-link")
        //var myDoc = {"@graph": [{key: "something"}]}
        //From the jsonld docs - doesn't work in this context...
        //const expanded = await jsonld.expand(doc, context);
        //console.log("EXPANDED", expanded)
        var term = context[key]
        arrayify(term, function(term){

          term = term[0]
          var expand1 = term["@id"] ? term["@id"] : term
          el.att("href", context[expand1.split(":")[0]]+expand1.split(":")[1])

        })

      }
      el.txt(key) //[0].toUpperCase() + key.substring(1))
      this.format_cell(node, key, row_el.ele("td"))
    }

    var files = []
    var datasets = []
    var readmes = []
    for (part of ["hasPart", "hasMember"] ){
      if (node[part]) {
        if (!Array.isArray(node[part])) {
          node[part] = [node[part]];
        }
        for (let [key, value] of Object.entries(node[part])) {
          if (value["@id"] && this.json_by_id[value["@id"]]) {
            var child = this.json_by_id[value["@id"]];
            if (child['@type']) {
              if (!Array.isArray(child['@type'])) {
                  child['@type'] = [child['@type']];
              }

              if (child['@type'].includes('Dataset')
                  || child['@type'].includes('RepositoryCollection')
                  || child['@type'].includes('RepositoryObject')
                  || (part =="hasMember" && child['@type'].includes('File'))) {
                datasets.push(child);
              }

              if (child['@type'].includes('File')) {
                files.push(child);
                if(/README\.\w*$/.test(child['path'])) {
                  readmes.push(child);
                }
                }

            }
          }
        }
      }
    }
    for (readme of readmes) {
      //var details = html.ele("details").att("open","open");
      console.log("Making readme", readme.path)
      var frame = html.ele("iframe")
      frame.att("width","80%");
      frame.att("height","90%");
      frame.att("src", readme.path);
      html.ele("hr");
      frame.att("border",1);
    }

    if (files.length > 0) {
      html.ele("h1", "Files: ")
      this.items_to_html(files, html, toc);
    }

    for (let [_, set] of Object.entries(datasets)) {
      this.dataset_to_html(set, html, toc);
    }




  },
  make_index_html : function make_index_html(crate_data) {
    // TODO change this interface to have a single parameter
    //console.log("JSON-path XXXXXXXXXXXXXXXXXXXXXXXXX", json_path);
    if (!crate_data['@graph']) {
      crate_data = require(crate_data);
    }
    //console.log(crate_data);
    this.json_by_id = {};
    this.json_by_url = {};
    this.json_by_type = {};
    //console.log("CRATE-data", crate_data)
    graph = crate_data["@graph"];

    for (let i = 0; i < graph.length ; i++) {
      var item = graph[i];
      if (item['@id']){
        this.json_by_id[item['@id']] = item;
      }
      if (item['path']){
        this.json_by_url[item['path']] = item;
      }
      if (item['@type']) {
        if (!Array.isArray(item['@type'])) {
            item['@type'] = [item['@type']];
        }
        for (let t of item['@type']) {
            if (!this.json_by_type[t]) {
              this.json_by_type[t] = [];
            }
            this.json_by_type[t].push(item);
        }
        }
    }
    // A container for our page
    var body_el = builder.create('div');
    //console.log("DATA", this.json_by_url);
    // Get root of graph
    root_node = this.json_by_url["./"] ? this.json_by_url["./"] :  this.json_by_url["data/"];
    if (root_node) {
      this.dataset_to_html(root_node, body_el);
    }

    delete this.json_by_type["Dataset"];
    delete this.json_by_type["File"];
    delete this.json_by_type["RepositoryCollection"];
    delete this.json_by_type["RepositoryObject"];
    for (let type of Object.keys(this.json_by_type).sort()) {
      body_el.ele("h1", "Contextual info: " + type);
      //this.items_to_html(this.json_by_type[type], body_el);
      for (let i of this.json_by_type[type]) {
        this.dataset_to_html(i, body_el);
      }//console.log(type);
    }
    this.html_el = body_el

  }
}
);

}
