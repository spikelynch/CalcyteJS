const shell = require('shelljs');
const builder = require('xmlbuilder');
const Datacite = require('../lib/datacite.js')
const assert = require("assert");
const default_test_dir = "test_output";
const text_citation_1 = "Peter Sefton (2017) Sample dataset for DataCrate v0.2. University of Technology Sydney. Datacrate. http://dx.doi.org/10.5281/zenodo.1009240";

function set_up_a_dir(test_dir = default_test_dir ) {
  // Set up a test directory with some files.
  shell.rm('-rf', test_dir);
  shell.mkdir('-p',test_dir);
  return test_dir;
}

describe("Create an Datactite citation", function(){
  it("Should create an citation", function(done) {
    //
    set_up_a_dir();
    citer = new Datacite();
    text_citation = citer.make_citation("./test_data/sample_CATALOG.json", "./test/test_output/datacite.xml")
    assert.equal(text_citation, text_citation_1);
    done();
  })
});
