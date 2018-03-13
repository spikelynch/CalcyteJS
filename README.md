# CalcyteJS

This is a work-in-progress port of the python-based [Calcyte tool](https://codeine.research.uts.edu.au/eresearch/calcyte).

## Status

This is pre-alpha code. It does run but several features are missing.

## About

Calcyte is (will be) a toolkit for managing metadata for collections of content
via automatically generated spreadsheets and for creating static HTML repositories.

Calcyte targets the [Draft DataCrate Packaging format v0.2](https://github.com/UTS-eResearch/datacrate/blob/new_draft/0.2/spec/0.2/data_crate_specification_v0.2.md).  
At this stage Calcyte does not Bag content, it jsut creates *Working DataCrates*.

## Installation (untested)

-  Install [node.js](https://nodejs.org/en/)

-  Install Siegfreid using the [instructions](https://github.com/richardlehane/siegfried/wiki/Getting-started).

-  Get the code:
    git clone https://code.research.uts.edu.au/eresearch/CalcyteJS.git

-  Link the binary for development use:

    npm link

## Usage / instructions

Usage:

```
> calcyfy --help

  Usage: calcyfy [options] <directories...>


  Options:

    -h, --help  output usage information
```


To run Calcyte on a group of directories pass it a list of directories

One directory:

```
calcyte test_data/sample
```

All the sample directories:

```
calcyte test_data/*

```

Calcyte will generate:

-  a CATALOG_$dir.xlsx file in each directory (this is for humans to fill in with
   metadata about the data)

-  An index.html file summarizing the data using metadata from CATALOG_$dir.xlsx

-  A CATALOG.json file containing JSON-LD metadata derived from the CATALOG* files plus some basic file-format information.

See the examples in ```test_data```.


TODO: Instructions for filling in the CATALOG files.
