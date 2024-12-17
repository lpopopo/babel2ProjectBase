export interface ParsedResult {
    imports: Array<{ source: string, specifiers: Array<{ name: string, type: string }> }>;
    exports: string[];
    exportDefault: string[];
    variables: string[];
    functions: string[];
    components: string[];
}

export interface ParsedResultMore{
    start?: number | null;
    end?: number | null;
    name: string | null;
    source: string;
    rangs?: ParsedResultMore[]
}