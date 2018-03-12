# CalcyteJS

This is a work-in-progress port of the python-based [Calcyte tool](https://codeine.research.uts.edu.au/eresearch/calcyte).

## Status

This is pre-alpha code. It does run but several features are missing.

## About

Calcyte is (will be) a toolkit for managing metadata for collections of content
via automatically generated spreadsheets and for creating static HTML repositories.

Calcyte targets the [Draft DataCrate Packaging format v0.2](https://github.com/UTS-eResearch/datacrate/blob/new_draft/0.2/spec/0.2/data_crate_specification_v0.2.md).  
At this stage Calcyte does not Bag content, it jsut creates *Working DataCrates*.

## Usage

To run calcyte on a group of directories pass it a list of directories


```
./calcyte test_data/sample
```

```
./calcyte test_data/*

```

Calcyte will generate a CATALOG.xlsx file in each directory.

TODO: Instructions for filling in the CATALOG files.
