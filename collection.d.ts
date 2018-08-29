// Type definitions for calcyte 0.0.2
// Project: DataCrate
// Definitions by: Mike Lynch


declare class Collection {
    constructor ();

    children: Item[]; // check
    rel_path: string;
    items: Item[];
    name_lookup: any;
    id_lookup: any;
    json_ld: Object;
    field_names_by_type: any;
    existing_catalogs: any;
    root_node: any;

    get_unique_catalog_name(dir: string, existing_catalogs?: string[]): string;
    index_graph(): void;
    generate_bag_info(): void;
    save_bag_info(): void;
    update():void;
    to_html():void;
    to_json(graph: Object):void;
    bag:(bag_dir: string):void;
    to_json_ld(): Promise<void>;
    read(dir:string, rel_path: string, parent:Collection):void;

}


