import * as cheerio from "cheerio"

export async function GET(req, res) {
  try {
    const response = await fetch("https://dps.psx.com.pk/symbols");
    const html = await response.text();
    const $ = cheerio.load(html);

    const headers = [];
    $("thead th").each((_, el) =>
      headers.push($(el).attr("data-name") || $(el).text().trim())
    );

    const rows = [];
    $("tbody tr").each((_, row) => {
      const obj = {};
      $(row)
        .find("td")
        .each((i, cell) => {
          const key = headers[i];
          const val = $(cell).attr("data-order") || $(cell).text().trim();
          obj[key] = val;
        });
      rows.push(obj);
    });

    return Response.json(rows);
  } catch (err) {
    console.log('=====3');
    console.log('error1', err);
    
    return Response.json({ error: err.message }, { status: 500 });
  }
}
