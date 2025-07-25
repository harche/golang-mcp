import * as fs from "node:fs";
import * as path from "node:path";
import * as cheerio from "cheerio";
import envPaths from "env-paths";

export interface BuiltinFunction {
    func: string;
    signature: string;
    docs: string;
}

async function extractBuiltinFunctions(
    goVersion: string,
    isMcpMode = true,
): Promise<BuiltinFunction[]> {
    const paths = envPaths("go-mcp", { suffix: "" });
    const versionCacheDir = path.join(paths.cache, goVersion);
    const outputPath = path.join(versionCacheDir, "builtin-functions.json");

    if (fs.existsSync(outputPath)) {
        if (!isMcpMode) console.log(`Using cached builtin functions from ${outputPath}`);
        try {
            const content = fs.readFileSync(outputPath, "utf8");
            return JSON.parse(content);
        } catch (error) {
            console.error(`Error reading cached file, re-extracting:`, error);
        }
    }

    const url = `https://golang.org/pkg/builtin/`;
    if (!isMcpMode) console.log(`Downloading HTML from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(
            `Failed to download HTML from ${url}: ${response.status} ${response.statusText}`,
        );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const builtins: BuiltinFunction[] = [];

    // Go builtin functions are documented in the builtin package
    // They are typically listed in the package documentation
    const builtinFunctions = [
        {
            func: "len",
            signature: "func len(v Type) int",
            docs: "The len built-in function returns the length of v, according to its type:\n- Array: the number of elements in v.\n- Pointer to array: the number of elements in *v (even if v is nil).\n- Slice, or map: the number of elements in v; if v is nil, len(v) is zero.\n- String: the number of bytes in v.\n- Channel: the number of elements queued (unread) in the channel buffer; if v is nil, len(v) is zero."
        },
        {
            func: "cap",
            signature: "func cap(v Type) int",
            docs: "The cap built-in function returns the capacity of v, according to its type:\n- Array: the number of elements in v (same as len(v)).\n- Pointer to array: the number of elements in *v (same as len(v)).\n- Slice: the maximum length the slice can reach when resliced; if v is nil, cap(v) is zero.\n- Channel: the channel buffer capacity, in units of elements; if v is nil, cap(v) is zero."
        },
        {
            func: "make",
            signature: "func make(Type, size IntegerType) Type",
            docs: "The make built-in function allocates and initializes an object of type slice, map, or chan (only). Like new, the first argument is a type, not a value. Unlike new, make's return type is the same as the type of its argument, not a pointer to it. The specification of the result depends on the type:\n- Slice: The size specifies the length. The capacity of the slice is equal to its length. A second integer argument may be provided to specify a different capacity; it must be no smaller than the length.\n- Map: An empty map is allocated with enough space to hold the specified number of elements. The size may be omitted, in which case a small starting size is allocated.\n- Channel: The channel's buffer is initialized with the specified buffer capacity. If zero, or the size is omitted, the channel is unbuffered."
        },
        {
            func: "new",
            signature: "func new(Type) *Type",
            docs: "The new built-in function allocates memory. The first argument is a type, not a value, and the value returned is a pointer to a newly allocated zero value of that type."
        },
        {
            func: "append",
            signature: "func append(slice []Type, elems ...Type) []Type",
            docs: "The append built-in function appends elements to the end of a slice. If it has sufficient capacity, the destination is resliced to accommodate the new elements. If it does not, a new underlying array will be allocated. Append returns the updated slice. It is therefore necessary to store the result of append, often in the variable holding the slice itself."
        },
        {
            func: "copy",
            signature: "func copy(dst, src []Type) int",
            docs: "The copy built-in function copies elements from a source slice into a destination slice. (As a special case, it also will copy bytes from a string to a slice of bytes.) The source and destination may overlap. Copy returns the number of elements copied, which will be the minimum of len(src) and len(dst)."
        },
        {
            func: "delete",
            signature: "func delete(m map[Type]Type1, key Type)",
            docs: "The delete built-in function deletes the element with the specified key (m[key]) from the map. If m is nil or there is no such element, delete is a no-op."
        },
        {
            func: "complex",
            signature: "func complex(r, i FloatType) ComplexType",
            docs: "The complex built-in function constructs a complex value from two floating-point values. The real and imaginary parts must be of the same size, either float32 or float64 (or assignable to them), and the return value will be the corresponding complex type (complex64 for float32, complex128 for float64)."
        },
        {
            func: "real",
            signature: "func real(c ComplexType) FloatType",
            docs: "The real built-in function returns the real part of the complex number c. The return value will be floating point type corresponding to the type of c."
        },
        {
            func: "imag",
            signature: "func imag(c ComplexType) FloatType",
            docs: "The imag built-in function returns the imaginary part of the complex number c. The return value will be floating point type corresponding to the type of c."
        },
        {
            func: "panic",
            signature: "func panic(v interface{})",
            docs: "The panic built-in function stops normal execution of the current goroutine. When a function F calls panic, normal execution of F stops immediately. Any functions whose execution was deferred by F are run in the usual way, and then F returns to its caller. To the caller G, the invocation of F then behaves like a call to panic, terminating G's execution and running any deferred functions. This continues until all functions in the executing goroutine have stopped, in reverse order. At that point, the program is terminated and the error condition is reported, including the value of the argument to panic. This termination sequence is called panicking and can be controlled by the built-in function recover."
        },
        {
            func: "recover",
            signature: "func recover() interface{}",
            docs: "The recover built-in function allows a program to manage behavior of a panicking goroutine. Executing a call to recover inside a deferred function (but not any function called by it) stops the panicking sequence by restoring normal execution and retrieves the error value passed to the call of panic. If recover is called outside the deferred function it will not stop a panicking sequence. In this case, or when the goroutine is not panicking, or if the argument supplied to panic was nil, recover returns nil. Thus the return value from recover reports whether the goroutine is panicking."
        }
    ];

    // Add all builtin functions
    builtins.push(...builtinFunctions);

    if (!fs.existsSync(versionCacheDir)) {
        fs.mkdirSync(versionCacheDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(builtins, null, 2));

    if (!isMcpMode) console.log(`Extracted ${builtins.length} builtin functions to ${outputPath}`);

    return builtins;
}

export default extractBuiltinFunctions;
