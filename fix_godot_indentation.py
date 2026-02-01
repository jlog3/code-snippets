import sys

# Usage:
# python fix_godot_indentation.py my_script.gd

# Doesn't overwrite or modify your original file. Instead, it creates a new file with the same directory/name but ".fixed" added to the end (e.g., my_script.gd becomes my_script.gd.fixed), so you can safely review and compare the two.

# Limitations: It's not a full parser like Godot's built-in editor or tools like gdformat (from the Godot Asset Library). It might mishandle very nested/complex code, multiline statements without colons, or edge cases like lambdas, custom continuations, or syntax errors in the original script. It also doesn't validate the code—it's just for indentation.

# Plugins: If your .gd file is part of a Godot plugin (e.g., extending EditorPlugin or using plugin-specific APIs), the script should still work fine since plugins use standard GDScript syntax. No special handling is needed beyond what's already there for classes and functions. But if the plugin script has unusual structures (e.g., deeply nested callbacks or non-standard blocks), test the output carefully.



def count_delimiters(s):
    delta = 0
    i = 0
    n = len(s)
    while i < n:
        if s[i] in '"\'':
            quote = s[i]
            i += 1
            while i < n and s[i] != quote:
                if s[i] == '\\':
                    i += 1
                i += 1
            if i < n:
                i += 1
        elif s[i] in '([{':
            delta += 1
            i += 1
        elif s[i] in ')]}':
            delta -= 1
            i += 1
        else:
            i += 1
    return delta

def get_line_type(stripped):
    if not stripped:
        return 'blank'
    if stripped.startswith('#'):
        return 'comment'
    words = stripped.split()
    if not words:
        return 'blank'
    first_word = words[0]
    second_word = words[1] if len(words) > 1 else None
    if stripped.startswith('@'):
        if second_word in ['var', 'const']:
            return 'var'
        else:
            return 'annotation'
    if first_word in ['extends', 'class_name']:
        return 'class_header'
    if first_word == 'signal':
        return 'signal_header'
    if first_word == 'func' or (first_word == 'static' and second_word == 'func'):
        return 'func'
    if first_word in ['var', 'const', 'enum'] or (first_word == 'static' and second_word in ['var', 'const']):
        return 'var'
    return 'other'

def post_process(lines):
    output = []
    prev_type = None
    comment_block_size = 0
    last_was_opener = False

    for line in lines:
        stripped = line.lstrip('\t')
        indent_level = len(line) - len(stripped)
        curr_type = get_line_type(stripped)

        if curr_type == 'blank':
            output.append(line)
            continue

        insert_blank = False
        if prev_type and curr_type != prev_type:
            if curr_type == 'comment':
                insert_blank = True
                if last_was_opener:
                    insert_blank = False
            elif prev_type == 'comment':
                insert_blank = (comment_block_size > 1)
            else:
                if indent_level == 0:
                    insert_blank = True

        if insert_blank:
            output.append('')

        output.append(line)

        if curr_type == 'comment':
            if prev_type == 'comment':
                comment_block_size += 1
            else:
                comment_block_size = 1
        else:
            comment_block_size = 0

        # Update last_was_opener
        if curr_type != 'blank' and curr_type != 'comment':
            code_part = stripped.split('#', 1)[0] if '#' in stripped else stripped
            delta = count_delimiters(code_part)
            ends_with_colon = stripped.endswith(':')
            last_was_opener = ends_with_colon or (delta > 0)
        else:
            last_was_opener = False

        prev_type = curr_type

    return output

def fix_gdscript_indentation(lines):
    stack = []
    current_indent = 0
    expression_level = 0
    output = []

    top_level_starters = ['func', 'signal', 'enum', 'class', 'class_name', 'extends', 'static', '@tool', '@onready']
    starter_keywords = ['if', 'elif', 'else', 'for', 'while', 'match', 'func', 'class', 'try', 'except', 'finally', 'signal', 'enum', 'static']
    continuation = {
        'elif': ['if'],
        'else': ['if', 'for', 'while', 'match'],  # GDScript supports else for loops?
        'except': ['try'],
        'finally': ['try'],
    }

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            output.append('\t' * (current_indent + expression_level) + stripped)
            continue

        words = stripped.split()
        first_word = words[0] if words else ''
        is_top_level = any(stripped.startswith(starter) for starter in top_level_starters) or (first_word == 'static' and len(words) > 1 and words[1] in ['func', 'var'])

        if is_top_level and current_indent > 0:
            stack = []
            current_indent = 0

        is_continuation = first_word in continuation
        if is_continuation:
            compatible_types = continuation[first_word]
            # Pop until compatible or empty
            while stack and stack[-1] not in compatible_types:
                stack.pop()
                current_indent -= 1
            if stack and stack[-1] in compatible_types:
                stack.pop()
                current_indent -= 1

        # Check for match case patterns
        ends_with_colon = stripped.endswith(':')
        is_pattern = ends_with_colon and first_word not in starter_keywords
        if is_pattern and stack and 'match' in stack:
            # Pop until 'match'
            while stack and stack[-1] != 'match':
                stack.pop()
                current_indent -= 1
            # Do not pop 'match'

        # Output the line
        indented_line = '\t' * (current_indent + expression_level) + stripped
        output.append(indented_line)

        # If opens a block
        if ends_with_colon:
            block_type = first_word
            if block_type == 'elif':
                block_type = 'if'
            elif block_type == 'static':
                block_type = words[1]  # func or var
            elif is_pattern:
                block_type = 'case'
            stack.append(block_type)
            current_indent += 1

        # Update expression level
        code_part = stripped.split('#', 1)[0] if '#' in stripped else stripped
        delta = count_delimiters(code_part)
        expression_level += delta
        expression_level = max(0, expression_level)

    return output

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python fix_indent.py <gdscript_file>")
        sys.exit(1)

    input_file = sys.argv[1]
    with open(input_file, 'r') as f:
        lines = f.readlines()

    fixed_lines = fix_gdscript_indentation(lines)
    fixed_lines = post_process(fixed_lines)

    output_file = input_file + ".fixed"
    with open(output_file, 'w') as f:
        f.writelines(line + '\n' for line in fixed_lines)

    print(f"Fixed script written to {output_file}")
