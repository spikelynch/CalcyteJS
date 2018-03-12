const Property = require("../property.js");
const assert = require("assert");

describe("Simple ID", function(){
  it("Should create an empty metadata set", function(done) {
    var f = new Property() ;
    f.parse("ID", "https://orcid.org/somethign");
    assert(f.is_id);
    assert.equal(f.data[0], "https://orcid.org/somethign");
    assert.equal(f.property, "schema:identifier");
    done();
  })
});

describe("File FOrmat", function(){
  it("Should create file metadata", function(done) {
    var f = new Property() ;
    f.parse("FileFormat", "JPEG File Interchange Format", links_to_id="http://www.nationalarchives.gov.uk/PRONOM/fmt/43");
    assert.equal(f.data[0], "JPEG File Interchange Format");
    assert.equal(f.links_to, "http://www.nationalarchives.gov.uk/PRONOM/fmt/43");
    assert.equal(f.property, "schema:fileFormat");
    done();
  })
});

describe("Repeating names", function(){
  it("Should find IDs", function(done) {
    var f = new Property() ;
    f.parse("RELATION:Creator*", "Mike Lake, Peter Sefton, Michael Lynch");
    assert(f.is_repeating);
    assert.equal(f.property, "schema:creator");
    assert.equal(f.name, "creator");
    assert.equal(f.data[0], "Mike Lake");
    assert.equal(f.data[1], "Peter Sefton");
    assert.equal(f.data[2], "Michael Lynch");
    done();
  })
});

describe("Escaping HTML", function(){
  it("Should escape HTML", function(done) {
    var f = new Property() ;
    f.parse("RELATION:Creator*", "Mike Lake & Peter Sefton & Michael Lynch");
    assert(f.is_repeating);
    assert.equal(f.property, "schema:creator");
    assert.equal(f.name, "creator");
    assert.equal(f.data[0], "Mike Lake & Peter Sefton & Michael Lynch");
    done();
  })
});

describe("Types", function(){
  it("Should recognize the TYPE: column header", function(done) {
    var f = new Property() ;
    f.parse("TYPE:", "Person");
    assert(f.is_type);
    assert.equal(f.property, undefined);
    assert.equal(f.data[0], "Person");
    done();
  })
});


describe("Nested", function(){
  it("Should recognize the TYPE: column header", function(done) {
    var f = new Property() ;
    f.parse("Creator>TYPE:Person>", "Name: Peter Sefton, ID: http://orcid.org/0000-0002-3545-944X");
    //console.log("SPILT TEST", "This:http://B;ah.asdsad.asdasd".split(":",2));
    assert.equal(f.property, "schema:creator");

    done();
  })
});
