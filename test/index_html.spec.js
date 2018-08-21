const shell = require("shelljs");
const builder = require("xmlbuilder");
const Index = require("../index_html.js");
const default_test_dir = "test_output";
const Datacite = require("../datacite.js");
const text_citation_1 =
  "Peter Sefton (2017) Sample dataset for DataCrate v0.2. University of Technology Sydney. Datacrate. http://dx.doi.org/10.5281/zenodo.1009240";
const assert = require("assert");

function set_up_a_dir(test_dir = default_test_dir) {
  // Set up a test directory with some files.
  shell.rm("-rf", test_dir);
  shell.mkdir("-p", test_dir);
  return test_dir;
}

describe("Test helper functions", function() {
  it("Test for path manipulation", function(done) {
    set_up_a_dir();
    var index_maker = new Index();
    // Single page version
    index_maker.init(
      "./test_data/sample_CATALOG.json",
      "./test/test_output/index.html",
      false
    );
    assert.equal(
      index_maker.get_href("http://dx.doi.org/10.5281/zenodo.1009240"),
      "#http://dx.doi.org/10.5281/zenodo.1009240"
    );

    // Multi page version
    index_maker.init(
      "./test_data/sample_CATALOG.json",
      "./test/test_output/index.html",
      true
    );
    assert.equal(
      index_maker.get_href("http://dx.doi.org/10.5281/zenodo.1009240"),
      "../CATALOG.html"
    );

    assert.equal(
      index_maker.item_by_id["http://orcid.org/0000-0002-3545-944X"][
        "@reverse"
      ]["creator"][0]["@id"],
      "http://dx.doi.org/10.5281/zenodo.1009240"
    );

    index_maker.init({
      "@graph": [
        {
          "@id": "https://dx.doi.org/10.4225/35/555d661071c76",
          name: "Farms to Freeways Example Dataset",
          path: ["data/"]
        }
      ]
    });

    /*
    citer = new Datacite();
    text_citation = citer.make_citation("./test_data/sample_CATALOG.json", "./test/test_output/sample_datacite.xml")

    index_maker.make_index_html(
                                "defaults/catalog_template.html",
                                text_citation);
    */
    //assert(Object.is(c.collection_metadata, {} ));

    // TODO - actual tests!!!!

    done();
  });
});
