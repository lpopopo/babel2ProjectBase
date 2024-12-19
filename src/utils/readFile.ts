import fs from 'fs';
import Path from 'path';

function readFile(filePath: string, encoding: BufferEncoding = 'utf-8') {
    const extensions = ['.js', '.jsx', '.ts', '.tsx'];
    const ext = Path.extname(filePath);
    if (!ext) {
        for (let ext of extensions) {
            const fullPath = `${filePath}${ext}`;
            if (fs.existsSync(fullPath)) {
                return fs.readFileSync(fullPath, { encoding });
            }
        }
    }
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            for (let ext of extensions) {
                const fullPath = `${filePath}/index${ext}`;
                if (fs.existsSync(fullPath)) {
                    return fs.readFileSync(fullPath, { encoding });
                }
            }
        } else {
            return fs.readFileSync(filePath, { encoding });
        }
    } else {
        throw new Error(`File not found: ${filePath}`);
    }
}

function getFilePath(filePath: string): string {
    const extensions = ['.js', '.jsx', '.ts', '.tsx'];
    const ext = Path.extname(filePath);
    if (!ext) {
        for (let ext of extensions) {
            const fullPath = `${filePath}${ext}`;
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }
        }
    }

    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            for (let ext of extensions) {
                const fullPath = `${filePath}/index${ext}`;
                if (fs.existsSync(fullPath)) {
                    return fullPath
                }
            }
        } else {
            return filePath;
        }
    } else {
        return filePath;
    }

    return filePath;
}

export {
    readFile,
    getFilePath
}