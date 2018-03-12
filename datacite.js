const builder = require('xmlbuilder');
var fs = require('fs');

module.exports = function(){
  return(
  {

  make_citation : function make_citation(crate_data, out_path) {
    /* Return a datacite citation in XML format """
    # Check we have the metadata we need as per DataCrate spec

    To generate DataCite.xml a DataCrate MUST have the following properties
    on the DataCrate Microdocument for the schema:Dataset level:
    *  A [schema:identifier] for the DataCrate which is a DOI URL.
    *  At least one [schema:creator] with a [schema:givenName] and [schema:familyName].
    *  At least one [schema:name] (which maps to a DataCite title).
    *  At least one [schema:publisher] property which SHOULD be an organization but may be a String
       value.
    *  A [schema:datePublished] property    in [ISO 8601 Date Format].
    """
    */
    //console.log(Object.keys(this.json_by_url));
    if (!crate_data['@graph']) {
      crate_data = require(crate_data);
    }
    this.json_by_id = {};
    this.json_by_url = {};
    this.json_by_type = {};
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
  //console.log("THIS JSON BY URL", this.json_by_url)
  var root = this.json_by_url["./"];
    var can_cite = true;
    var report = "";
    const ns = "http://datacite.org/schema/kernel-4"
    var xml = builder.create('resource', { encoding: 'utf-8' })
    xml.att('xmlns', ns);
    xml.att('schemaLocation', 'http://datacite.org/schema/kernel-4 http://schema.datacite.org/meta/kernel-4/metadata.xsd')

    //console.log(xml.end({ pretty: true }));
    // Look for creators
    var creators_strings = [];
    if (root["creator"]){
        var creators = root["creator"];
        if (!Array.isArray(creators)){
            creators = [creators]
          }

        var creators_el = xml.ele('creators');
        //console.log(xml.end({ pretty: true }));

        for (var i = 0; i < creators.length; i++) {
            var found_creator = false;
            var creator_names = "";
            var creator = this.json_by_id[creators[i]["@id"]];
            var creator_el;
            //console.log("Looking at creator", creators[i])
              if  (creator["familyName"] && creator["givenName"]) {
              //console.log("Got names");
              creator_el = creators_el.ele("creator");
              creator_names = creator["familyName"] + ", " + creator["givenName"];
              creator_el.ele("creatorName", creator_names) ;
              creator_el.ele('givenName', creator["givenName"]);
              creator_el.ele('familyName', creator["familyName"]);
              found_creator = true;
              creators_strings.push(creator_names);
            } else if (creator["name"]) {
              //console.log("Got a name");
              creator_el = creators_el.ele("creator").ele("creatorName", creator["name"]);
              creators_strings.push(creator["name"]);
              creator_names = creator["name"];
              found_creator = true;
            }
            if (found_creator && creator["@id"] && creator["@id"].match("https?://orcid.org/")) {
              var name_id_el = creator_el.ele("nameIdentifier", creator["@id"]);
              name_id_el.att("schemeURI","http://orcid.org");
              name_id_el.att("nameIdentifierScheme", "ORCID");
            }

            }
          }

      if (creators_strings.length === 0) {
        can_cite = false;
        report += "Data citations requires *  At least one [schema:creator] with a [schema:givenName] and [schema:familyName]."
      }
    if (root["@id"]){
      var identifier = root["@id"];
      if (identifier.startsWith('http://dx.doi.org/10.')) {
          //<identifier identifierType="DOI">10.5072/example-full</identifier>
          id_el = xml.ele("identifier", identifier.replace("http://dx.doi.org/",""))
          id_el. att("identifierType", "DOI");
        }
      else {
          can_cite = false;
        }
      }
      else
      {
            report += "There is no Identifier";
            can_cite = false;
      }

      var name = "";
      if (root["name"]){
          /*
      <titles>
      <title xml:lang="en-us">Full DataCite XML Example</title>
      <title xml:lang="en-us" titleType="Subtitle">
                   Demonstration of DataCite Properties.</title>
      </titles>
          */
          var titles_el = xml.ele("titles");
          titles_el.ele("title", root["name"]);
          name = root["name"];
      }
      else {
          can_cite = false;
          report += "Data Citation requires at least one [schema:name] (Title) (which maps to a DataCite title).";
        }


        if (root["publisher"]) {
            /*
            <publisher>DataCite</publisher>
           */
            var publisher = root["publisher"]
            if (publisher["@id"] && this.json_by_id[publisher["@id"]] && this.json_by_id[publisher["@id"]].name){
                publisher = this.json_by_id[publisher["@id"]].name
            }
            xml.ele("publisher", publisher);
          }
        else {
            can_cite = false;
            report += "At least one [schema:publisher] property which SHOULD be an organization but may be a String";
          }
        if (root["datePublished"] && root["datePublished"].match(/^\d\d\d\d/)) {
            //<publicationYear>2014</publicationYear>
            published = root["datePublished"].slice(0,4);
            var date_published_el = xml.ele("publicationYear", published);
          }
        else {
            can_cite = false;
            report += "A [schema:datePublished] property in [ISO 8601 Date Format]";
        }
        xml.ele("resourceType","DataCrate v0.1").att("resourceTypeGeneral", "Dataset");


        this.citation = "";
        if (can_cite){
          //Datacite text citation:
          //Creator (PublicationYear): Title. Version. Publisher. ResourceType. Identifier
          //console.log(creators_strings);

          this.citation += creators_strings.join(", ");
          this.citation += ` (${published}) `;
          this.citation += `${name}. `;
          this.citation += `${publisher}. `;
          this.citation += "Datacrate. ";
          this.citation += identifier;
          //console.log("REPORT" + report);
          //console.log("CITATION",  this.citation);
          //console.log(xml.end({ pretty: true }));

          }   else {
                console.log("CAN'T CITE", report);
                this.citation = report;

              }

        return this.citation;


    },

}
)}
