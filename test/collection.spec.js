
const Collection = require("../collection.js");
const assert = require("assert");
const shell = require("shelljs");
var fs = require('fs');
var path = require('path');
const XLSX = require('xlsx');
const Datacite = require('../datacite.js')



const default_test_dir = "test_output"

function setup_a_dir(test_dir = default_test_dir ) {
  // Set up a test directory with some files.
  shell.rm('-rf', test_dir);
  shell.mkdir('-p',test_dir);
  ["1","two","three file","2 times 2"].forEach(function(f){
      ['.txt','.pdf','.sh'].forEach(function(e){
          fs.writeFileSync(path.join(test_dir, f + e));
  });

});
  return test_dir;
}

function remove_test_file(f, test_dir = default_test_dir) {
  shell.rm('-rf', path.join(test_dir, f));

}

describe("Create unique CATALOG.xlsx filenames", function(){
  it("Should create nice names", function(done){
    var c = new Collection();

    assert.equal(c.get_unique_catalog_name("/home/me/my_dir", existing_catalogs= []),
                  "CATALOG_my_dir.xlsx");
    assert.equal(c.get_unique_catalog_name("/home/me/my_dir", existing_catalogs= ["CATALOG_my_dir.xlsx"]),
                  "CATALOG_my_dir_1.xlsx");
    assert.equal(c.get_unique_catalog_name("/home/me/my_dir", existing_catalogs= ["CATALOG_my_dir.xlsx", "CATALOG_my_dir_1.xlsx"]),
                "CATALOG_my_dir_2.xlsx");

    assert.equal(c.get_unique_catalog_name("/home/me/my dir/", existing_catalogs= []),
                  "CATALOG_my_dir.xlsx");
    done();
  })

});


describe("Create a CATALOG", function(){
  it("Should create a catalog from scratch for test files", function(){
  this.timeout(15000);
  var test_path = setup_a_dir();
  var c = new Collection();

  c.read(test_path);
  var sheet_json = XLSX.utils.sheet_to_json(c.workbook.Sheets["Files"]);
  assert.equal(sheet_json[0]["FILE:Filename"], "1.pdf");

  remove_test_file("1.pdf")
  var c = new Collection();
  c.read(test_path);
  sheet_json = XLSX.utils.sheet_to_json(c.workbook.Sheets["Files"]);
  //console.log(sheet_json);
  // 1.pdf deleted but still in spreadsheet
  assert.equal(sheet_json[0]["FILE:Filename"], "1.pdf");
  assert.equal(sheet_json[0]["*MISSING-FILE*"], "1");

  return c.to_json_ld().then(
    function() {
      //console.log(JSON.stringify(c.json_ld, null, 2));
      assert.equal(c.json_by_id["./"]["hasPart"].length, 11);
      assert(!c.json_by_id["./1.pdf"]);
      assert(c.json_by_id["1.sh"]);
      c.to_html();
    },
    function(err) {
      console.log(err)
    });

  })

});

describe("Create MANY CATALOGS", function(){
  it("Should create appropriately named catalogs", function(done){
  this.timeout(15000);
  var test_path = setup_a_dir();
  shell.mkdir('-p', path.join(test_path,"a","a","a","b"))
  shell.mkdir('-p', path.join(test_path,"b","a","a","b"))
  //console.log(test_path);
  var c = new Collection();
  c.read(test_path);
  //console.log(c.existing_catalogs);
  //console.log(shell.test('-e', path.join(test_path,"a","CATALOG_a.xlsx")))
  assert(shell.test('-e', path.join(test_path,"a","CATALOG_a.xlsx")));
  assert(shell.test('-e', path.join(test_path,"a","a", "CATALOG_a_1.xlsx")));
  assert(shell.test('-e', path.join(test_path,"a","a","a", "CATALOG_a_2.xlsx")));
  assert(shell.test('-e', path.join(test_path,"b","a","a", "CATALOG_a_4.xlsx")));
  done();
  })

});


describe("Create empty collection", function(){
  it("Should create an empty metadata set", function(done) {
    var c = new Collection();
    assert.deepEqual(c.collection_metadata.properties, {} );
    assert.equal(c.children.length, 0);
    assert.equal(c.rel_path, "./" );
    //assert(Object.is(c.collection_metadata, {} ));
    done();
  })
});


describe("GTM", function(){
  it("Should create an non-empty metadata set", function() {
    var c = new Collection();
    c.read("test_data/GTM")
    //console.log("Props", c.collection_metadata.properties);
    assert.equal(c.collection_metadata.properties["name"].data , "GTM");
    assert.equal(c.children.length, 0);
    //console.log(c.namy_dir_lookup);
    //console.log(c.things);
    //assert(Object.is(c.collection_metadata, {} ));

    return c.to_json_ld().then(
      function() {
        //console.log(JSON.stringify(c.json_ld, null, 2));
        assert.equal(c.json_by_id["./"]["hasPart"].length, 4);
        assert.equal(c.json_by_id["./"]["name"], "GTM");
      },
      function(err) {
        console.log(err)
      });
    c.to_html();

  })
});

describe("Glop Plot data", function(){
  it("Test basic metadata, and simple regression test for HTML", function() {
    var c = new Collection();
    c.read("test_data/Glop_Pot")
    assert.equal(c.collection_metadata.properties["name"].data , "Glop Pot data");
    assert.equal(c.children.length, 3);
    //assert.equal(c.children[0].collection_metadata.properties["Description"].data, "NOT THIS");

    assert.equal(c.children[0].children.length, 0 );

    function remove_ids(h) {
      // IDs are random so remove them for comparison purposes
      //TODO: assign IDs usng hash of metadata
      return h.replace(/........-....-....-....-............/g,'x');
    }

    return c.to_json_ld().then(
      function() {
        c.to_html();
        assert.equal(c.json_by_id["http://dx.doi.org/10.1016/this_is_an_example_not_a_real_DOI"]["hasPart"].length, 5);
        assert.equal(c.json_by_url["sketchsheets"]["hasPart"].length, 3);
        //console.log("IDS", c.json_by_url["sketchsheets"]["hasPart"]);
        var a_file = c.json_by_id["sketchsheets/CP7Glopsketch01.jpg"];
        assert.equal(a_file.contentSize, "179640");
        assert.equal(a_file.encodingFormat, "JPEG File Interchange Format");
        assert.equal(a_file.fileFormat, "http://www.nationalarchives.gov.uk/PRONOM/fmt/43");
        generated_html = remove_ids(String(fs.readFileSync("test_data/Glop_Pot/index.html")));
        expected_html = remove_ids(String(fs.readFileSync("test_data/Glop_Pot_index.html")));
        assert.equal(generated_html, expected_html);
      },
      function(err) {
        console.log(err)
      });
  })
});

describe("Sample data details", function(){
  it("Should create an non-empty metadata set", function() {
    var c = new Collection();
    c.read("test_data/sample")
    //console.log(c.collection_metadata.properties);
    assert.equal(c.collection_metadata.properties["name"].data , "Sample dataset for DataCrate v0.2");
    assert.equal(c.children.length, 2);
    //console.log(c.namy_dir_lookup);
    //console.log(c.things);
    //assert(Object.is(c.collection_metadata, {} ));
    return c.to_json_ld().then(
      function() {
        //console.log("JSON-LD", JSON.stringify(c.json_ld, null, 2));
        c.to_html();
        //console.log("JSON BY ID", c.json_by_id)
        //console.log(JSON.stringify(flattenated, null, 2));
        assert.equal(c.json_by_id["http://dx.doi.org/10.5281/zenodo.1009240"]["hasPart"].length, 2);
        assert.equal(c.json_by_id["http://www.geonames.org/8152662/catalina-park.html"].name, 'Catalina Park');
        //console.log("Place data", c.json_by_id["http://www.geonames.org/8152662/catalina-park.html"])
        var catalina_location_id = c.json_by_id["http://www.geonames.org/8152662/catalina-park.html"].geo['@id'];
        var catalina_geo = c.json_by_id[catalina_location_id];
        assert.equal(catalina_geo.latitude, '-33.7152');
        assert.equal(catalina_geo.longitude, '150.30119');


      },
      function(err) {
        console.log(err)
      });

  })
});


describe("Sample data bagged", function(){
  it("Should create a bag", function() {
    var c = new Collection();
    c.read("test_data/sample");
    shell.rm('-rf', "test_output/bags/sample");
    c.bag("test_output/bags/sample");
    //console.log(c.collection_metadata.properties);

    return c.to_json_ld().then(
      function() {
        //console.log("JSON-LD", JSON.stringify(c.json_ld, null, 2));
        c.to_html();
        c.generate_bag_info();
        c.save_bag_info();
        assert.equal(c.bag_meta["Contact-Email"], "pt@ptsefton.com");
        assert(shell.test('-e', 'test_output/bags/sample/CATALOG.json'));
        assert(shell.test('-e', 'test_output/bags/sample/index.html'));

        assert.equal(c.json_by_id["http://dx.doi.org/10.5281/zenodo.1009240"]["hasPart"].length, 2);
        assert.equal(c.json_by_id["http://www.geonames.org/8152662/catalina-park.html"].name, 'Catalina Park');
        //console.log("Place data", c.json_by_id["http://www.geonames.org/8152662/catalina-park.html"])
        var catalina_location_id = c.json_by_id["http://www.geonames.org/8152662/catalina-park.html"].geo['@id'];
        var catalina_geo = c.json_by_id[catalina_location_id];
        assert.equal(catalina_geo.latitude, '-33.7152');
        assert.equal(catalina_geo.longitude, '150.30119');


      },
      function(err) {
        console.log(err)
      });

  })
});

describe("HTML from JSON", function(){
  it("Should create an HTML page from JSON-LD", function() {
    var c = new Collection();
    c.read("test_data/sample");
    //console.log(c.collection_metadata.properties);

    return c.to_json_ld().then(
      function() {

        c.to_html();

      },
      function(err) {
        console.log(err)
      });



  })
});

describe("Datacite", function(){
  it("Should create a data citation", function() {
    var c = new Collection();
    c.read("test_data/Glop_Pot")
    //assert.equal(c.json_ld["@graph"][0]["hasPart"].length, 5);
    return c.to_json_ld().then(
      function () {
      citer = new Datacite();
      text_citation = citer.make_citation("./test_data/Glop_Pot/CATALOG.json", "./test_data/Glop_pot/datacite.xml")
      assert.equal(text_citation, "Lake, Mike; Vaughan-Taylor, Keir; Klocker, Andreas; Maynard, Phil (2017) Glop Pot data. Sydney University Speleological Society. Datacrate. http://dx.doi.org/10.1016/this_is_an_example_not_a_real_DOI");

    },
    function(err) {
      console.log(err)
    });


  })
});
