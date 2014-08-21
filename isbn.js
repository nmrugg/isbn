"use strict";

///TODO: Make a seperate file that updates from the official XML.
/// https://www.isbn-international.org/range_file_generation
/// https://www.isbn-international.org/?q=download_range/15821/RangeMessage.xml
var ranges = {
        "978": {
            "0": [ /// English speaking
                {s: "00", e: "19"},
                {s: "200", e: "699"},
                {s: "7000", e: "8499"},
                {s: "85000", e: "89999"},
                {s: "900000", e: "949999"},
                {s: "9500000", e: "9999999"},
            ],
            "1": [ /// English speaking
                {s: "00", e: "09"},
                {s: "100", e: "327"},
                {s: "328", e: "329"},
                {s: "330", e: "399"},
                {s: "4000", e: "5499"},
                {s: "55000", e: "86979"},
                {s: "869800", e: "998999"},
                {s: "9990000", e: "9999999"},
            ],
        },
        "979": {}
    },
    svg_head = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"2in\" height=\"1.2in\" version=\"1.1\"><g id=\"isbn\"><rect width=\"2in\" height=\"1.2in\" x=\"0\" y=\"0\" style=\"fill:#FFFFFF;fill-opacity:1;stroke:none\"/>",
    svg_foot = "</g></svg>",
    svg_bars_head = "<g id=\"bars\" style=\"fill:#000000;fill-opacity:1;stroke:none\">",
    svg_bars_foot = "</g>",
    svg_nums_head = "<g id=\"nums\" style=\"font-family:Liberation Mono, Droid Sans Mono, Monospace, mono;font-size:13px;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;letter-spacing:0px;word-spacing:0px;text-anchor:middle;fill:#000000;fill-opacity:1;stroke:none\">",
    svg_nums_foot = "</g>",
    svg_text_head = "<g id=\"text\" style=\"font-family:Liberation Mono, Droid Sans Mono, Monospace, mono;font-size:10px;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;letter-spacing:0px;word-spacing:0px;text-anchor:middle;fill:#000000;fill-opacity:1;stroke:none\">",
    svg_text_foot = "</g>",
    ean_13_structure = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"],
    ean_13_structure2 = "RRRRRR",
    codes = {
        L: ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"],
        R: ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"],
        G: ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"]
    },
    code_bars = {
        L: [],
        R: [],
        G: []
    },
    generate_barcode;

function clean_isbn(isbn)
{
    ///NOTE: The checksum value for ISBN 10 can be an X (repersenting the number 10).
    return String(isbn).toUpperCase().replace(/[^\dX]+/g, "");
}

///NOTE: The calcutating functions assume the isbn is in the correct format (optinally missing the last number).
function calculate_check_10(isbn)
{
    var tmp = 0,
        i;
    
    for (i = 0; i < 9; i += 1) {
        tmp += isbn[i] * (10 - i);
    }
    
    tmp = 11 - (tmp) % 11;
    
    if (tmp === 10) {
        tmp = "X";
    }
    return tmp
}

function calculate_check_13(isbn)
{
    var tmp = 0,
        i;
    
    for (i = 0; i < 12; i += 1) {
        tmp += isbn[i] * (i % 2 ? 3 : 1);
    }
    
    return (10 - tmp % 10) % 10;
}

function check_10(isbn)
{
    isbn = clean_isbn(isbn);
    if (isbn.length !== 10) {
        return false;
    }
    
    ///NOTE: Since the checksum can be "X", we need to make sure it's a string.
    return String(calculate_check_10(isbn)) === isbn[9];
}

function check_13(isbn)
{
    isbn = clean_isbn(isbn);
    if (isbn.length !== 13) {
        return false;
    }
    
    return calculate_check_13(isbn) === Number(isbn[12]);
}

/// Converts between 10 & 13 length formats.
function convert(isbn)
{
    isbn = clean_isbn(isbn);
    if (isbn.length === 10) {
        return "978" + isbn.substr(0, 9) + calculate_check_13("978" + isbn);
    } else if (isbn.length === 13) {
        if (isbn.substr(0, 3) === "978") {
            return isbn.substr(3, 9) + calculate_check_10(isbn.substr(3, 9));
        } else {
            return isbn; /// Unconvertable
        }
    }
}

function hyphenate_10(isbn, prefix)
{
    var i,
        group,
        group_len,
        publisher_len,
        tmp_str;
    
    if (isbn.length !== 10) {
        return isbn;
    }
    
    if (!prefix) {
        prefix = "978";
    }
    
    if (!ranges[prefix]) {
        return isbn;
    }
    
    for (i = 1; i <= 7; i += 1) {
        tmp_str = isbn.substr(0, i);
        if (ranges[prefix][tmp_str]) {
            group = ranges[prefix][tmp_str];
            group_len = i;
            break;
        }
    }
    
    for (i = group_len; i <= 7; i += 1) {
        tmp_str = isbn.substr(group_len, i);
        group.some(function onsome(subrange)
        {
            if (subrange.s.length === i) {
                if (Number(tmp_str) >= subrange.s && Number(tmp_str) <= subrange.e) {
                    publisher_len = i;
                    return true; /// break
                }
            }
        });
        if (publisher_len) {
            break;
        }
    }
    
    if (group_len && publisher_len) {
        return isbn.substr(0, group_len) + "-" + isbn.substr(group_len, publisher_len) + "-" + isbn.substr(group_len + publisher_len, 10 - (group_len + publisher_len) - 1) + "-" + isbn[9];
    }
    
    return isbn;
}

function hyphenate(isbn)
{
    isbn = clean_isbn(isbn);
    if (isbn.length === 10) {
        return hyphenate_10(isbn);
    } else if (isbn.length === 13) {
        return isbn.substr(0, 3) + "-" + hyphenate_10(isbn.substr(3, 10), isbn.substr(0, 3));
    } else {
        return isbn;
    }
}

generate_barcode = (function ()
{
    var start_x = 430,
        y = "0.17in",
        w = 12,
        long_h = "0.9in",
        short_h = "0.84in";
    
    function format_num(num)
    {
        return (num / 1000) + "in";
    }
    
    function get_marker(x)
    {
        return "<rect width=\"" + format_num(w) + "\" height=\"" + long_h + "\" x=\"" + format_num(x * w + start_x) + "\" y=\"" + y + "\"/>" +
               "<rect width=\"" + format_num(w) + "\" height=\"" + long_h + "\" x=\"" + format_num((x + 2) * w + start_x) + "\" y=\"" + y + "\"/>";
    }
    
    function determine_bars(col, digit)
    {
        var bars = [],
            code = codes[col][digit],
            i,
            which = 0;
        
        for (i = 0; i < 7; i += 1) {
            if (code[i] === "1") {
                /// Did it find a new line?
                if (!bars[which]) {
                    bars[which] = {offset: i, len: 1};
                } else {
                    bars[which].len += 1;
                }
            } else {
                /// Is it at the end of a line?
                if (bars[which]) {
                    which += 1;
                    /// Did it find both?
                    if (which > 1) {
                        break;
                    }
                }
            }
        }
        
        /// Cache results.
        code_bars[col][digit] = bars;
        
        return bars;
    }
    
    function get_bars(col, digit, offset)
    {
        var bars = code_bars[col][digit] || determine_bars(col, digit),
            svg = "";
        
        bars.forEach(function oneach(bar)
        {
            svg += "<rect width=\"" + format_num(w * bar.len) + "\" height=\"" + short_h + "\" x=\"" + format_num((offset + bar.offset) * w + start_x) + "\" y=\"" + y + "\"/>";;
        });
        
        return svg;
    }
    
    function generate_bars(isbn)
    {
        var bars = get_marker(0), /// Create start marker
            i,
            structure = ean_13_structure[Number(isbn[0])] + ean_13_structure2,
            offset = 3; ///NOTE: The start marker is 3 width.
        
        ///NOTE: The first digit is skipped because it changes the structure.
        for (i = 1; i < 13; i += 1) {
            bars += get_bars(structure[i - 1], isbn[i], offset);
            offset += 7; ///NOTE: Each set of bars take up 7 places.
            if (i === 6) {
                bars += get_marker(offset + 1);
                offset += 5;
            }
        }
        
        /// Create end marker
        bars += get_marker(offset);
        
        return bars;
    }
    
    function generate_nums(isbn)
    {
        var y = "y=\"1.12in\"";
        
        isbn = make_mono(isbn);
        
        return "<text><tspan x=\"0.38in\" " + y + ">" + isbn[0] + "</tspan></text>" +
               "<text><tspan x=\"0.725in\" " + y + ">" + isbn.substr(1, 6) + "</tspan></text>" +
               "<text><tspan x=\"1.28in\" " + y + ">" + isbn.substr(7, 6) + "</tspan></text>" +
               "<text><tspan x=\"1.63in\" "  + y + ">" + "&gt;" + "</tspan></text>";
    }
    
    function generate_text(isbn)
    {
        var y = "y=\"0.13in\"";
        
        ///NOTE: N-dashes look better than hyphens.
        isbn = make_mono(hyphenate(convert(isbn))).replace(/-/g, "–");
        
        return "<text><tspan x=\"1in\" " + y + ">ISBN " + isbn + "</tspan></text>";
    }
    
    function make_mono(isbn)
    {
        return isbn.replace(/0/g, "O"); /// O's look better than zeros.
    }
    
    return function generate_barcode(isbn, force)
    {
        var svg = "";
        
        isbn = clean_isbn(isbn);
        
        if (isbn.length === 10) {
            if (!force && !check_10(isbn)) {
                return new Error("Invalid ISBN");
            }
            ///NOTE: We just create 13 barcodes.
            isbn = convert(isbn);
        } else if (isbn.length === 13) {
            if (!force && !check_13(isbn)) {
                return new Error("Invalid ISBN");
            }
        } else {
            return new Error("Invalid ISBN");
        }
        
        svg += svg_bars_head + generate_bars(isbn) + svg_bars_foot;
        
        svg += svg_nums_head + generate_nums(isbn) + svg_nums_foot;
        
        svg += svg_text_head + generate_text(isbn) + svg_text_foot;
        
        return svg_head + svg + svg_foot;
    }
}());

console.log(generate_barcode("978-1500901622"));

/*
console.log(check_13("978-1500901622"));
console.log(check_10("1500901628"));
console.log(convert("978-1500901622") === "1500901628");
console.log(convert("1500901628") === "9781500901622");
console.log(convert(convert("1500901628")) === "1500901628");
console.log(check_10("85-359-0277-5"));
console.log(check_10("0-8044-2957-x"));
console.log(convert("0-8044-2957-X") === "9780804429573");
console.log(convert(convert("0-8044-29 57x")) === "080442957X");
console.log(hyphenate("978-1500901622") === "978-1-5009-0162-2");
console.log(hyphenate(convert("978-1500901622")) === "1-5009-0162-8");
console.log(hyphenate(convert("0943396042")) === "978-0-943396-04-0");
console.log(hyphenate("0-943396-04-2") === "0-943396-04-2");
console.log(hyphenate("09752298-0 x") === "0-9752298-0-X");
console.log(hyphenate("0684843285") === "0-684-84328-5");
*/
