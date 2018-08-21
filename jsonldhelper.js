/* This is part of Calcyte a tool for implementing the DataCrate data packaging
spec.  Copyright (C) 2018  University of Technology Sydney

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/* Defaults for Calcyte such as names of key files */

var jsonld = require("jsonld");



const init = function init(json) {
    this.json_ld = json;
    this.item_by_id = {};
    this.item_by_url = {};
    this.item_by_type = {}; // dict of arrays
    //console.log("CRATE-data", crate_data)
    graph = this.json_ld["@graph"];

    for (let i = 0; i < graph.length; i++) {
        var item = graph[i];
        for (let key of Object.keys(item)) { //TODO: Filter
            if (key != "@id" && key != "@reverse") {
                if (!item[key]) {
                    item[key] = "";
                }
                if (!Array.isArray(item[key])) {
                    item[key] = [item[key]];
                    //console.log("Making array", key, item[key])
                }
            }
        }
        if (item["@id"]) {
            this.item_by_id[item["@id"]] = item;
        }
        if (item["path"]) {
            this.item_by_url[item["path"]] = item;
        }
        if (!item["@type"]) {
            item["@type"] = ["Thing"];
        }
        //console.log("TYPE", item['@type'])
        for (let t of item["@type"]) {
            //console.log(t)
            if (!this.item_by_type[t]) {
                this.item_by_type[t] = [];
            }
            this.item_by_type[t].push(item);
        }
    }


}

const add_back_links = function () {
    // Add @reverse properties if not there
    for (let i = 0; i < graph.length; i++) {
        var item = graph[i];
        this.make_back_links(item);
    }
}


module.exports = function () {
    return {
        init: init,
        add_back_links: add_back_links,
        item_by_path: this.item_by_path,
        item_by_id: this.item_by_id,
        item_by_type: this.item_by_type
    }
};


