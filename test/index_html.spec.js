const shell = require('shelljs');
const builder = require('xmlbuilder');
const Index = require('../lib/index_html.js');
const default_test_dir = "test_output";
const Datacite = require('../lib/datacite.js')
const text_citation_1 = "Peter Sefton (2017) Sample dataset for DataCrate v0.2. University of Technology Sydney. Datacrate. http://dx.doi.org/10.5281/zenodo.1009240";


function set_up_a_dir(test_dir = default_test_dir ) {
  // Set up a test directory with some files.
  shell.rm('-rf', test_dir);
  shell.mkdir('-p',test_dir);
  return test_dir;
}

describe("Create an HTML page", function(){
  it("This test doesn't have any actual tests yet", function(done) {
    set_up_a_dir();
    var index_maker = new Index()
    //console.log(index_maker);
    index_maker.make_index_html("./test_data/sample_CATALOG.json");
    //assert(Object.is(c.collection_metadata, {} ));
    citer = new Datacite();
    text_citation = citer.make_citation("./test_data/sample_CATALOG.json", "./test/test_output/sample_datacite.xml")
    index_maker.write_html("defaults/catalog_template.html", "./test/test_output/index.html", text_citation);

    // TODO - actual tests!!!!

    done();
  })
});
