const std = @import("std");
const Ast = std.zig.Ast;
const assert = std.debug.assert;

const Walk = @import("Walk");
const Decl = Walk.Decl;

const gpa = std.heap.wasm_allocator;
const Oom = error{OutOfMemory};

/// Delete this to find out where URL escaping needs to be added.
pub const missing_feature_url_escape = true;

pub const RenderSourceOptions = struct {
    skip_doc_comments: bool = false,
    skip_comments: bool = false,
    collapse_whitespace: bool = false,
    fn_link: Decl.Index = .none,
    /// Assumed to be sorted ascending.
    source_location_annotations: []const Annotation = &.{},
    /// Concatenated with dom_id.
    annotation_prefix: []const u8 = "l",
    /// Whether to add markdown code fence wrapper.
    add_code_fence: bool = true,
};

pub const Annotation = struct {
    file_byte_offset: u32,
    /// Concatenated with annotation_prefix.
    dom_id: u32,
};

pub fn fileSourceHtml(
    file_index: Walk.File.Index,
    out: *std.ArrayListUnmanaged(u8),
    root_node: Ast.Node.Index,
    options: RenderSourceOptions,
) !void {
    const ast = file_index.get_ast();

    const start_token = ast.firstToken(root_node);
    const end_token = ast.lastToken(root_node) + 1;

    var cursor: usize = ast.tokenStart(start_token);

    var indent: usize = 0;
    if (std.mem.lastIndexOf(u8, ast.source[0..cursor], "\n")) |newline_index| {
        for (ast.source[newline_index + 1 .. cursor]) |c| {
            if (c == ' ') {
                indent += 1;
            } else {
                break;
            }
        }
    }

    var next_annotate_index: usize = 0;

    // Add markdown code fence if requested
    if (options.add_code_fence) {
        try out.appendSlice(gpa, "```zig\n");
    }

    for (
        ast.tokens.items(.tag)[start_token..end_token],
        ast.tokens.items(.start)[start_token..end_token],
        start_token..,
    ) |tag, start, token_index| {
        const between = ast.source[cursor..start];
        if (std.mem.trim(u8, between, " \t\r\n").len > 0) {
            if (!options.skip_comments) {
                try appendUnindentedPlain(out, between, indent);
            }
        } else if (between.len > 0) {
            if (options.collapse_whitespace) {
                if (out.items.len > 0 and out.items[out.items.len - 1] != ' ')
                    try out.append(gpa, ' ');
            } else {
                try appendUnindentedPlain(out, between, indent);
            }
        }
        if (tag == .eof) break;
        const slice = ast.tokenSlice(token_index);
        cursor = start + slice.len;

        // Skip annotations in markdown mode
        while (true) {
            if (next_annotate_index >= options.source_location_annotations.len) break;
            const next_annotation = options.source_location_annotations[next_annotate_index];
            if (cursor <= next_annotation.file_byte_offset) break;
            next_annotate_index += 1;
        }

        switch (tag) {
            .eof => unreachable,

            .keyword_addrspace,
            .keyword_align,
            .keyword_and,
            .keyword_asm,
            .keyword_break,
            .keyword_catch,
            .keyword_comptime,
            .keyword_const,
            .keyword_continue,
            .keyword_defer,
            .keyword_else,
            .keyword_enum,
            .keyword_errdefer,
            .keyword_error,
            .keyword_export,
            .keyword_extern,
            .keyword_for,
            .keyword_if,
            .keyword_inline,
            .keyword_noalias,
            .keyword_noinline,
            .keyword_nosuspend,
            .keyword_opaque,
            .keyword_or,
            .keyword_orelse,
            .keyword_packed,
            .keyword_anyframe,
            .keyword_pub,
            .keyword_resume,
            .keyword_return,
            .keyword_linksection,
            .keyword_callconv,
            .keyword_struct,
            .keyword_suspend,
            .keyword_switch,
            .keyword_test,
            .keyword_threadlocal,
            .keyword_try,
            .keyword_union,
            .keyword_unreachable,
            .keyword_var,
            .keyword_volatile,
            .keyword_allowzero,
            .keyword_while,
            .keyword_anytype,
            .keyword_fn,
            => {
                try out.appendSlice(gpa, slice);
            },

            .string_literal,
            .char_literal,
            .multiline_string_literal_line,
            => {
                try out.appendSlice(gpa, slice);
            },

            .builtin => {
                try out.appendSlice(gpa, slice);
            },

            .doc_comment,
            .container_doc_comment,
            => {
                if (!options.skip_doc_comments) {
                    try out.appendSlice(gpa, slice);
                }
            },

            .identifier => {
                try out.appendSlice(gpa, slice);
            },

            .number_literal => {
                try out.appendSlice(gpa, slice);
            },

            .bang,
            .pipe,
            .pipe_pipe,
            .pipe_equal,
            .equal,
            .equal_equal,
            .equal_angle_bracket_right,
            .bang_equal,
            .l_paren,
            .r_paren,
            .semicolon,
            .percent,
            .percent_equal,
            .l_brace,
            .r_brace,
            .l_bracket,
            .r_bracket,
            .period,
            .period_asterisk,
            .ellipsis2,
            .ellipsis3,
            .caret,
            .caret_equal,
            .plus,
            .plus_plus,
            .plus_equal,
            .plus_percent,
            .plus_percent_equal,
            .plus_pipe,
            .plus_pipe_equal,
            .minus,
            .minus_equal,
            .minus_percent,
            .minus_percent_equal,
            .minus_pipe,
            .minus_pipe_equal,
            .asterisk,
            .asterisk_equal,
            .asterisk_asterisk,
            .asterisk_percent,
            .asterisk_percent_equal,
            .asterisk_pipe,
            .asterisk_pipe_equal,
            .arrow,
            .colon,
            .slash,
            .slash_equal,
            .comma,
            .ampersand,
            .ampersand_equal,
            .question_mark,
            .angle_bracket_left,
            .angle_bracket_left_equal,
            .angle_bracket_angle_bracket_left,
            .angle_bracket_angle_bracket_left_equal,
            .angle_bracket_angle_bracket_left_pipe,
            .angle_bracket_angle_bracket_left_pipe_equal,
            .angle_bracket_right,
            .angle_bracket_right_equal,
            .angle_bracket_angle_bracket_right,
            .angle_bracket_angle_bracket_right_equal,
            .tilde,
            => try out.appendSlice(gpa, slice),

            .invalid, .invalid_periodasterisks => return error.InvalidToken,
        }
    }

    // Add closing markdown code fence if requested
    if (options.add_code_fence) {
        try out.appendSlice(gpa, "\n```");
    }
}

fn appendUnindented(out: *std.ArrayListUnmanaged(u8), s: []const u8, indent: usize) !void {
    var it = std.mem.splitScalar(u8, s, '\n');
    var is_first_line = true;
    while (it.next()) |line| {
        if (is_first_line) {
            try appendEscaped(out, line);
            is_first_line = false;
        } else {
            try out.appendSlice(gpa, "\n");
            try appendEscaped(out, unindent(line, indent));
        }
    }
}

fn appendUnindentedPlain(out: *std.ArrayListUnmanaged(u8), s: []const u8, indent: usize) !void {
    var it = std.mem.splitScalar(u8, s, '\n');
    var is_first_line = true;
    while (it.next()) |line| {
        if (is_first_line) {
            try out.appendSlice(gpa, line);
            is_first_line = false;
        } else {
            try out.appendSlice(gpa, "\n");
            try out.appendSlice(gpa, unindent(line, indent));
        }
    }
}

pub fn appendEscaped(out: *std.ArrayListUnmanaged(u8), s: []const u8) !void {
    for (s) |c| {
        try out.ensureUnusedCapacity(gpa, 6);
        switch (c) {
            '&' => out.appendSliceAssumeCapacity("&amp;"),
            '<' => out.appendSliceAssumeCapacity("&lt;"),
            '>' => out.appendSliceAssumeCapacity("&gt;"),
            '"' => out.appendSliceAssumeCapacity("&quot;"),
            else => out.appendAssumeCapacity(c),
        }
    }
}

fn walkFieldAccesses(
    file_index: Walk.File.Index,
    out: *std.ArrayListUnmanaged(u8),
    node: Ast.Node.Index,
) Oom!void {
    const ast = file_index.get_ast();
    assert(ast.nodeTag(node) == .field_access);
    const object_node, const field_ident = ast.nodeData(node).node_and_token;
    switch (ast.nodeTag(object_node)) {
        .identifier => {
            const lhs_ident = ast.nodeMainToken(object_node);
            try resolveIdentLink(file_index, out, lhs_ident);
        },
        .field_access => {
            try walkFieldAccesses(file_index, out, object_node);
        },
        else => {},
    }
    if (out.items.len > 0) {
        try out.append(gpa, '.');
        try out.appendSlice(gpa, ast.tokenSlice(field_ident));
    }
}

fn resolveIdentLink(
    file_index: Walk.File.Index,
    out: *std.ArrayListUnmanaged(u8),
    ident_token: Ast.TokenIndex,
) Oom!void {
    const decl_index = file_index.get().lookup_token(ident_token);
    if (decl_index == .none) return;
    try resolveDeclLink(decl_index, out);
}

fn unindent(s: []const u8, indent: usize) []const u8 {
    var indent_idx: usize = 0;
    for (s) |c| {
        if (c == ' ' and indent_idx < indent) {
            indent_idx += 1;
        } else {
            break;
        }
    }
    return s[indent_idx..];
}

pub fn resolveDeclLink(decl_index: Decl.Index, out: *std.ArrayListUnmanaged(u8)) Oom!void {
    const decl = decl_index.get();
    switch (decl.categorize()) {
        .alias => |alias_decl| try alias_decl.get().fqn(out),
        else => try decl.fqn(out),
    }
}
