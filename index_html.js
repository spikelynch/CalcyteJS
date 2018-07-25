const builder = require('xmlbuilder');
var fs = require('fs');
var ejs = require('ejs');
context = require('./defaults/context.json');
const path = require('path');
const shell = require("shelljs");
const jsonld = require("jsonld");
const display_keys = ["@type", "name", "@id", "description", "thumbnail", "datePublished", "creator", "path", "encodingFormat", "contentSize"]

// TODO - Put this in a utility function
const arrayify = function arrayify(something, callback) {
  if (!Array.isArray(something)){
      something = [something]
    }
  return callback(something)
}

const ele  = function ele(name, atts={}) {

  t = "<" + name;
  for (let key in atts){
    t += " " + key + " = '" + atts[key] + "'"
  }
  t += "\n>"
  return t
}



const  close  = function close(name) {
  return  "</" + name + "\n>"
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
    this.html = template({html: this.html, citation: citation_text, zip_link: zip_link});
    if (out_path) {
      fs.writeFileSync(out_path, this.html);
    }

  },
  sort_keys : function(keys) {
    // Sort a set or array of keys to be in the same order as those in context.json
    // Returns set
    var keys_in_order = new Set()
    keys = new Set(keys)
    for (let key of display_keys){
      if (keys.has(key)) {
        keys_in_order.add(key)
      }
    }
    for (let key of keys){
      if (!keys_in_order.has(key)) {
        keys_in_order.add(key)
      }
    }


    return keys_in_order;
  },


  format_cell : function(f, k, td_ele) {
    var data = f[k];
    if (!Array.isArray(data)) {
        data = [data];
    }
    var i = 0;
    for (let part of data) {
      //console.log("PART", part)
      if (!part) {

      } else if (k == "@type") {
        this.format_header(part, td_ele)
      } else if (k === 'name' && f["@id"].match(/^https?:\/\//i)) {
        td_ele += ele("a", {href: f["@id"], 'class': 'fa fa-external-link', 'title': f["@id"]})
        //td_ele.ele("a", part).att('href', f["@id"]).att('class', 'fa fa-external-link').att('title',f["@id"]);

      } else if (k === 'thumbnail' && part["@id"]  && this.json_by_id[part["@id"]]) {
          td_ele += ele('img', {'src': this.json_by_id[part["@id"]]["path"]});
     } else if (k === 'path') {
        td_ele += ele("a", {'href': part})
        td_ele += part.replace(/\/$/,"").split('/').pop()
        td_ele += close("a")
      } else if (k === 'encodingFormat' && f.fileFormat && f.fileFormat.match(/^https?:\/\//i)){
        td_ele += ele("a", {'href': f.fileFormat, 'class': 'fa fa-external-link', 'title': f.fileFormat});
        td_ele += part
        td_ele += close("a")
      } else if (
        (k != "hasPart") &&
        this.json_by_id[part['@id']] &&
        !(this.json_by_id[part['@id']].name || this.json_by_id[part['@id']].description)) {
        // Embed small bits of info that don't have a name or description
        td_ele += this.dataset_to_html(this.json_by_id[part['@id']], "");
      } else if (part['@id'] && this.json_by_id[part['@id']]) {
        var target_name = this.json_by_id[part['@id']].name ? this.json_by_id[part['@id']].name : part['@id'];
        td_ele += ele('a', {'href': '#' + part['@id']});
        td_ele += target_name
        td_ele += close('a')

      }

      else {
        td_ele += part;
      }
      i++;
      if (i < data.length) {
        td_ele += ", ";
      }
    }
    return td_ele;
  },

  format_header : function format_header(key, el){
    if (context[key]){
      // TODO deal with more complex case by using JSON-LD library
      var term = context[key]
      arrayify(term, function(term){

        term = term[0]
        var expand1 = term["@id"] ? term["@id"] : term
        href = context[expand1.split(":")[0]]+expand1.split(":")[1]

      })
      el += ele("a", {"class": "fa fa-external-link", "href": href})
      //var myDoc = {"@graph": [{key: "something"}]}
      //From the jsonld docs - doesn't work in this context...
      //const expanded = await jsonld.expand(doc, context);
      //console.log("EXPANDED", expanded)
      el += key
      el += close("a")

    }
    else {
      el += key
    }

    return(el)
  },

  dataset_to_html : function dataset_to_html(node, html, toc, out_path) {
    html += ele("hr")

    html += ele("table", {"class": "table", "id": node["@id"]})

    var keys = new Set(Object.keys(node));

    keys.delete("@id");
    keys.delete("identifier");
    keys.delete("filename");
    if (keys.has("encodingFormat"  )) {
      keys.delete("fileFormat");
    }

    //keys.delete("@type");


    //keys.delete("hasPart");
    key_set = this.sort_keys(keys);
    for (let key of key_set) {
      var value = node[key];
      html += ele("tr")
      html += ele("th")
      html += this.format_header(key, "")//[0].toUpperCase() + key.substring(1))
      html += close("th")
      html += ele("td")
      html += this.format_cell(node, key, "")
      html += close("td")
      html += close("tr")
    }

    html += close("table")

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
      //console.log("Making readme", readme.path)
      html += ele("iframe", {"width": "80%", "height": "90%", "src": readme.path, "border": 1})
      html += lose("iframe")
      html += ele("hr")

    }

    if (files.length > 0) {
      html += ele("h1")
      html += "Files: "
      html += close("h1")
      for (let f of files) {
        html += this.dataset_to_html(f, "", toc);
      }
    }

    for (let [_, set] of Object.entries(datasets)) {
      html += this.dataset_to_html(set, "", toc);
    }
   return html


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
    body_el = ""
    body_el += ele('div');
    //console.log("DATA", this.json_by_url);
    // Get root of graph
    root_node = this.json_by_url["./"] ? this.json_by_url["./"] :  this.json_by_url["data/"];
    if (root_node) {
      body_el += this.dataset_to_html(root_node, "");
    }

    delete this.json_by_type["Dataset"];
    delete this.json_by_type["File"];
    delete this.json_by_type["RepositoryCollection"];
    delete this.json_by_type["RepositoryObject"];
    for (let type of Object.keys(this.json_by_type).sort()) {
      body_el += ele("h1")
      body_el += "Contextual info: ";
      body_el += ele("span")
      body_el += this.format_header("")
      body_el += close("span")
      body_el += close("h1")
      //this.items_to_html(this.json_by_type[type], body_el);
      for (let i of this.json_by_type[type]) {
        body_el += this.dataset_to_html(i, "");
      }//console.log(type);
    }
    body_el += close("div")
    this.html = body_el;

  }
}
);

}
