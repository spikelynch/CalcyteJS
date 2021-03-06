# CalcyteJS

This is a work-in-progress port of the python-based [Calcyte tool](https://codeine.research.uts.edu.au/eresearch/calcyte).

## Status

This is Beta code.

## About

Calcyte is a toolkit to implement the [DataCrate] specification:

1.  Managing metadata for collections of content via automatically generated
    spreadsheets, to create CATALOG.json files
2.  Generating HTML from DataCrate CATALOG.json files.
3.  Packaging data in BagIt format, and optionally zipping it.

Calcyte targets the [Draft DataCrate Packaging format v0.3](https://github.com/UTS-eResearch/datacrate/blob/master/spec/0.3/data_crate_specification_v0.3.md).

## Installation

- Install [node.js](https://nodejs.org/en/)

- Install the [BagIt](https://github.com/LibraryOfCongress/bagit-java)
  `brew install bagit`

- Install Siegfreid using the [instructions](https://github.com/richardlehane/siegfried/wiki/Getting-started).

- Get the code:
  git clone https://code.research.uts.edu.au/eresearch/CalcyteJS.git

- Link the binary for development use:

  npm link

## Usage / instructions

Usage:

```
> ./calcyfy
Usage: calcyfy [options] <directories...>

 To run calcyfy on a group of directories pass it a list of directories


 Options:

   -V, --version         output the version number
   -g, --generate-html   Generate HTML from a "CATALOG.json" in a directory
   -b,  --bag [bag-dir]  Create Bagit Bag(s) under [bag-dir])
   -n,  --no             No Citation - only applies ith --bag
   -z,  --zip            Create a zipped version of the bag - only applies with --bag
   -d,  --depth          Maximum depth to recurse into directories
   -r,  --recurse        Recurse into directories - up to 10
   -m, --multiple        Output multiple files instead of a single CATALOG.html
   -h, --help            output usage information
```

To run Calcyte on a group of directories pass it a list of directories

One directory:

```
calcyfy test_data/Glop_Pot
```

This will create a CATALOG.json file and CATALOG.html file in test_data/Glop_Pot

All the sample directories:

```
calcyfy test_data/*
```

Calcyte will generate:

- a CATALOG\_$dir.xlsx file in each directory (this is for humans to fill in with
  metadata about the data)

- An index.html file summarizing the data using metadata from CATALOG\_$dir.xlsx

- A CATALOG.json file containing JSON-LD metadata derived from the CATALOG\* files plus some basic file-format information.

See the examples in `test_data`.

TODO: Instructions for filling in the CATALOG files.

[datacrate]: https://github.com/UTS-eResearch/datacrate
