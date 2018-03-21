const builder = require('xmlbuilder');
var fs = require('fs');
var ejs = require('ejs');
context = require('./defaults/context.json');

module.exports = function(){
  return(
  {
  write_html : function write_html(template_path, out_path, citation_text) {
    //
    var temp = fs.readFileSync(template_path, { encoding: 'utf8' });
    var template = ejs.compile(temp);
    this.html = template({html: this.html_el.end({ pretty: true }), citation: citation_text});
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
    for (let [_, part] of data.entries()) {
      //console.log("PART", part)
      if (part === undefined) {

      } else if (k === 'name' && f["@id"].match(/^https?:\/\//i)) {
        td_ele.ele("a", part).att('href', f["@id"]);
      } else if (k === 'path') {
        td_ele.ele("a", part.split('/').pop()).att('href', part) ;
      } else if (k === 'encodingFormat' && f.fileFormat && f.fileFormat.match(/^https?:\/\//i)){
        td_ele.ele("a", part).att('href', f.fileFormat);
      } else if (
        this.json_by_id[part['@id']] &&
        !(this.json_by_id[part['@id']].name || this.json_by_id[part['@id']].description)) {
        // Embed small bits of info that don't have a name or description
        this.dataset_to_html(this.json_by_id[part['@id']], td_ele);
      } else if (part['@id'] && this.json_by_id[part['@id']]) {
        var target_name = this.json_by_id[part['@id']].name ? this.json_by_id[part['@id']].name : value[part['@id']];
        td_ele.ele('a',target_name).att('href', '#' + part['@id']);
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

  dataset_to_html : function dataset_to_html(node, html, toc) {
    var table_el = html.ele("table").att("class", "table")
    if (node["@id"]) {
       table_el.att("id", node["@id"]);
     }

    var keys = new Set(Object.keys(node).filter(k => !(/hasPart/.test(k))));
    keys.delete("@id");
    keys.delete("identifier");
    keys.delete("@type");
    key = this.sort_keys(keys);
    for (let key of keys) {
      var value = node[key];
      var row_el = table_el.ele("tr")
      row_el.ele("th", key[0].toUpperCase() + key.substring(1));
      this.format_cell(node, key, row_el.ele("td"))
    }
    if (node.hasPart) {
      if (!Array.isArray(node.hasPart)) {
        node.hasPart = [node.hasPart];
      }
      var files = [];
      var datasets = [];
      for (let [key, value] of Object.entries(node.hasPart)) {
        if (value["@id"] && this.json_by_id[value["@id"]]) {
          var child = this.json_by_id[value["@id"]];
          if (child['@type']) {
            if (child['@type'] === 'Dataset') {
              datasets.push(child);
            }
            if (child['@type'] === 'File') {
              files.push(child);
            }
          }
        }

      }
    if (files.length > 0) {
      html.ele("h1", "Files: ")
      this.items_to_html(files, html, toc);
    }
    for (let [_, set] of Object.entries(datasets)) {
      this.dataset_to_html(set, html, toc);
    }

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
        if (!this.json_by_type[item['@type']]) {
          this.json_by_type[item['@type']] = [];
        }
        this.json_by_type[item['@type']].push(item);
      }

    }
    // A container for our page
    var body_el = builder.create('div');
    //console.log("DATA", this.json_by_url);
    // Get root of graph
    root_node = this.json_by_url["./"];
    if (root_node) {
      this.dataset_to_html(root_node, body_el);
    }

    delete this.json_by_type["Dataset"];
    delete this.json_by_type["File"];

    for (let type of Object.keys(this.json_by_type).sort()) {
      body_el.ele("h1", "Contextual info: " + type);
      this.items_to_html(this.json_by_type[type], body_el);
      //console.log(type);
    }
    this.html_el = body_el

  }
}
);

}
