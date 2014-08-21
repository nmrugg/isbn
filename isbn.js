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
    svg_foot = "</g></svg>"
    svg_bars_head = "<g id=\"bars\" style=\"fill:#000000;fill-opacity:1;stroke:none\">",
    svg_bars_foot = "</g>",
    ean_13_structure = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"],
    codes = {
        L: ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"],
        R: [],
        G: [],
    };

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
        return isbn.substr(3, 9) + calculate_check_10(isbn.substr(3, 9));
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

function generate_barcode(isbn, force)
{
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
    
}

(function calculate_codes()
{
    var i;
    
    codes.L.forEach(function oneach(L)
    {
        var R = "",
            G = "",
            d;
            
        for (i = 0; i < 7; i += 1) {
            d = L[i] === "0" ? "1" : "0";
            R += d;
            G = d + G;
        }
        codes.R.push(R);
        codes.G.push(G);
    });
}());

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
