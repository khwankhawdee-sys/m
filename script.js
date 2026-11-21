/* =========================================================
   Body Scent — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : แสดงสินค้า + ปุ่มกรอง mood
   - order.html   : เติมฟอร์มจาก URL + ส่งคำสั่งซื้อไป Apps Script
   - admin.html   : แสดงคำสั่งซื้อจาก Google Sheet (CSV)
   แต่ละส่วนจะทำงานเฉพาะเมื่อหน้านั้นมี element ที่ต้องใช้
   ========================================================= */

/* ---------- ค่าตั้งต้น ---------- */
var APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw7oLYMWSe2OrJLNBTNVZ_M4g7J_-2teyVZuggs3PY-NULMDOHcWBYifLeOCHbWeVnQ/exec";

var SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRoPUW9fzPNn6u48GAvYMHndVroqLb5pKsSdW-tyA9OtvOh1_nAXt-qtGUiGBIp41Qv5rmxAitgATWi/pub?gid=0&single=true&output=csv";

var MOODS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "fresh", label: "Fresh" },
  { key: "sweet", label: "Sweet" },
  { key: "confident", label: "Confident" },
  { key: "romance", label: "Romance" }
];

/* ---------- ตัวช่วยเล็กๆ ---------- */
function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function formatPrice(value) {
  var n = Number(value);
  return isNaN(n) ? String(value) : n.toLocaleString("th-TH");
}

/* =========================================================
   1) หน้า product.html
   ========================================================= */
function initProductPage() {
  var filterBar = document.getElementById("filter-bar");
  var list = document.getElementById("product-list");
  if (!filterBar || !list) return;

  var products = [];
  var currentMood = "all";

  // mood เริ่มต้นจาก ?mood=xxx
  var moodParam = (new URLSearchParams(window.location.search).get("mood") || "")
    .toLowerCase();
  var validMood = MOODS.some(function (m) {
    return m.key === moodParam;
  });
  if (validMood) currentMood = moodParam;

  function renderFilters() {
    filterBar.innerHTML = "";
    MOODS.forEach(function (m) {
      var btn = el(
        "button",
        "filter" + (m.key === currentMood ? " is-active" : ""),
        m.label
      );
      btn.type = "button";
      btn.setAttribute("data-mood", m.key);
      btn.addEventListener("click", function () {
        currentMood = m.key;
        renderFilters();
        renderProducts();
      });
      filterBar.appendChild(btn);
    });
  }

  function buildCard(p) {
    var itemName = p.name + (p.size ? " " + p.size : "");
    var orderUrl =
      "order.html?item=" +
      encodeURIComponent(itemName) +
      "&price=" +
      encodeURIComponent(p.price);

    var card = el("article", "card");
    card.setAttribute("data-mood", p.mood);

    // รูป
    var media = el("div", "card__media");
    var img = document.createElement("img");
    img.src = p.image;
    img.alt = p.name;
    img.loading = "lazy";
    media.appendChild(img);

    // เนื้อหา
    var body = el("div", "card__body");

    var mood = el("div", "card__mood");
    mood.appendChild(el("span", "mood-dot mood-dot--" + p.mood));
    mood.appendChild(document.createTextNode(p.mood));
    body.appendChild(mood);

    body.appendChild(el("h3", "card__title", p.name));
    if (p.size) body.appendChild(el("div", "card__meta", p.size));

    // ราคา + ปุ่มสั่งซื้อ
    var footer = el("div", "card__footer");
    var price = el("span", "price", formatPrice(p.price) + " ");
    price.appendChild(el("small", "", "บาท"));
    footer.appendChild(price);

    var order = el("a", "btn btn--accent btn--small", "สั่งซื้อ");
    order.href = orderUrl;
    footer.appendChild(order);

    body.appendChild(footer);
    card.appendChild(media);
    card.appendChild(body);
    return card;
  }

  function renderProducts() {
    list.innerHTML = "";
    var shown = products.filter(function (p) {
      return currentMood === "all" || p.mood === currentMood;
    });

    if (shown.length === 0) {
      list.appendChild(el("p", "text-center", "ไม่พบสินค้าในหมวดนี้"));
      return;
    }
    shown.forEach(function (p) {
      list.appendChild(buildCard(p));
    });
  }

  renderFilters();

  fetch("products.json")
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      products = data;
      renderProducts();
    })
    .catch(function (error) {
      console.error(error);
      list.innerHTML = "";
      list.appendChild(
        el("p", "text-center", "โหลดข้อมูลสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")
      );
    });
}

/* =========================================================
   2) หน้า order.html
   ========================================================= */
function initOrderPage() {
  var form = document.getElementById("orderForm");
  if (!form) return;

  // เติม items และ total จาก URL parameter ทันทีที่โหลดหน้า
  var params = new URLSearchParams(window.location.search);
  var item = params.get("item");
  var price = params.get("price");

  var itemsInput = document.getElementById("items");
  var totalInput = document.getElementById("total");

  if (itemsInput && item !== null) itemsInput.value = item;
  if (totalInput && price !== null) totalInput.value = price;

  // กดปุ่มยืนยันสั่งซื้อ
  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var payload = {
      customerName: document.getElementById("customerName").value,
      contact: document.getElementById("contact").value,
      items: document.getElementById("items").value,
      total: document.getElementById("total").value,
      note: document.getElementById("note").value
    };

    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    })
      .then(() => {
        window.location.href = "thankyou.html";
      })
      .catch((error) => {
        console.error(error);
        alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        if (submitBtn) submitBtn.disabled = false;
      });
  });
}

/* =========================================================
   3) หน้า admin.html
   ========================================================= */

// parse CSV เอง: รองรับ "..." , "" (เครื่องหมายคำพูดซ้อน), คอมมาและขึ้นบรรทัดใหม่ในช่อง
function parseCSV(text) {
  var rows = [];
  var row = [];
  var field = "";
  var inQuotes = false;

  // ตัด BOM ถ้ามี
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (var i = 0; i < text.length; i++) {
    var ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  // แถวสุดท้ายที่ไม่มีขึ้นบรรทัดใหม่ปิดท้าย
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function initAdminPage() {
  var tbody = document.querySelector("#ordersTable tbody");
  if (!tbody) return;

  function showMessage(msg) {
    tbody.innerHTML = "";
    var tr = document.createElement("tr");
    var td = el("td", "", msg);
    td.colSpan = 6;
    td.style.textAlign = "center";
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  showMessage("กำลังโหลดข้อมูล...");

  // ใส่ตัวเลขท้าย URL เพื่อลดโอกาสได้ข้อมูลเก่าจากแคชของเบราว์เซอร์
  var url = SHEET_CSV_URL + "&_=" + Date.now();

  fetch(url, { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    })
    .then(function (text) {
      var rows = parseCSV(text).filter(function (r) {
        // ตัดแถวว่าง
        return r.some(function (c) {
          return c.trim() !== "";
        });
      });

      // ถ้าแถวแรกเป็นหัวตาราง (ช่องแรกไม่มีตัวเลขเลย เช่น "วันเวลา") ให้ข้ามไป
      if (rows.length > 0 && !/\d/.test(rows[0][0] || "")) {
        rows.shift();
      }

      if (rows.length === 0) {
        showMessage("ยังไม่มีคำสั่งซื้อ");
        return;
      }

      // รายการล่าสุดขึ้นก่อน (ข้อมูลถูกเพิ่มต่อท้ายชีตเรื่อยๆ จึงกลับลำดับ)
      rows.reverse();

      tbody.innerHTML = "";
      rows.forEach(function (r) {
        var tr = document.createElement("tr");
        for (var i = 0; i < 6; i++) {
          var value = r[i] !== undefined ? r[i] : "";
          if (i === 4 && value !== "" && !isNaN(Number(value))) {
            value = formatPrice(value);
          }
          tr.appendChild(el("td", "", value));
        }
        tbody.appendChild(tr);
      });
    })
    .catch(function (error) {
      console.error(error);
      showMessage("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    });
}

/* ---------- เริ่มทำงาน ---------- */
document.addEventListener("DOMContentLoaded", function () {
  initProductPage();
  initOrderPage();
  initAdminPage();
});
