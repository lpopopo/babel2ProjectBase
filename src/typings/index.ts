export interface ParsedResult {
    imports: Array<{ source: string, specifiers: Array<{ name: string, type: string }> }>;
    exports: string[];
    exportDefault: string[];
    variables: string[];
    functions: string[];
    components: string[];
}