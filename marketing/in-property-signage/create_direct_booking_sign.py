from pathlib import Path
from urllib.parse import urlencode
import qrcode
from qrcode.constants import ERROR_CORRECT_Q

root = Path(__file__).resolve().parent
property_ids = [
    "the-briar", "hospital-district", "hollytree-golf-dining", "alamo-house",
    "green-acres", "legacy-house", "azalea-spring-cottage", "noir-hollytree",
    "hollytree-king-bed", "hollytree-townhouse",
]


def tracking_url(property_id: str | None = None) -> str:
    query = {
        "utm_source": "in_property",
        "utm_medium": "qr",
        "utm_campaign": "return_guest",
    }
    if property_id:
        query["utm_content"] = property_id
    return "https://www.rosecitystays.com/?" + urlencode(query)


def make_qr(url: str, output: Path) -> None:
    qr = qrcode.QRCode(version=None, error_correction=ERROR_CORRECT_Q, box_size=24, border=5)
    qr.add_data(url)
    qr.make(fit=True)
    qr.make_image(fill_color="#10281b", back_color="#fffdfd").save(output)


def write_sign_html(qr_filename: str, output: Path) -> None:
    html = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rose City Stays — Book Direct Sign</title>
  <style>
    @page {{ size: A5 portrait; margin: 0; }}
    :root {{ --rose:#f7c4d9; --green:#075a21; --ink:#173022; --paper:#fffdfd; }}
    * {{ box-sizing: border-box; }}
    html, body {{ margin:0; padding:0; width:148mm; min-height:210mm; background:#ececec; }}
    body {{ font-family: Georgia, 'Times New Roman', serif; }}
    main {{ width:148mm; min-height:210mm; position:relative; overflow:hidden; background:var(--rose); color:var(--ink); display:flex; flex-direction:column; align-items:center; text-align:center; padding:8.8mm 13.2mm 9.5mm; }}
    main::before {{ content:""; position:absolute; inset:5.8mm; border:0.55mm solid var(--green); border-radius:5.5mm; pointer-events:none; }}
    .arch {{ position:absolute; width:100mm; height:48mm; top:-24mm; border:0.55mm solid rgba(7,90,33,.55); border-radius:0 0 50mm 50mm; }}
    .leaf {{ position:absolute; top:12mm; left:14mm; width:10mm; height:10mm; border-radius:100%; border:0.5mm solid rgba(7,90,33,.48); }}
    .leaf::after {{ content:""; position:absolute; width:0.45mm; height:14mm; background:rgba(7,90,33,.48); transform:rotate(-42deg); left:4.6mm; top:-2.3mm; }}
    .brand {{ width:43mm; height:43mm; object-fit:cover; border-radius:1mm; mix-blend-mode:multiply; position:relative; margin-top:2.2mm; }}
    .eyebrow {{ position:relative; margin:2.8mm 0 3.2mm; font-family:Arial,sans-serif; letter-spacing:.17em; font-size:2.8mm; text-transform:uppercase; color:var(--green); font-weight:700; }}
    h1 {{ position:relative; font-size:9.5mm; font-weight:normal; line-height:1.05; margin:0; letter-spacing:-.02em; color:#144525; }}
    h1 em {{ font-style:italic; }}
    .rule {{ width:20mm; height:.65mm; background:var(--green); margin:4.5mm 0 4.2mm; }}
    .copy {{ position:relative; width:98%; max-width:104mm; font-family:Arial,sans-serif; font-size:3.55mm; line-height:1.48; margin:0 0 4.4mm; color:#25402f; }}
    .qr-wrap {{ position:relative; width:58mm; height:58mm; padding:3.5mm; background:var(--paper); border:1.2mm solid var(--green); border-radius:3.5mm; box-shadow:0 2mm 0 rgba(7,90,33,.12); }}
    .qr-wrap img {{ width:100%; height:100%; display:block; }}
    .cta {{ position:relative; margin:4.4mm 0 1.8mm; padding:2.2mm 8.5mm 2.5mm; border-radius:999px; background:var(--green); color:white; font-family:Arial,sans-serif; font-size:4.2mm; letter-spacing:.12em; font-weight:700; }}
    .url {{ position:relative; font-family:Arial,sans-serif; font-size:3.55mm; letter-spacing:.065em; color:var(--green); font-weight:700; }}
    .footer {{ position:relative; margin-top:auto; padding-top:5mm; font-family:Arial,sans-serif; color:#275036; font-size:2.85mm; line-height:1.4; }}
    .footer strong {{ display:block; letter-spacing:.12em; font-size:2.45mm; color:var(--green); margin-bottom:1.2mm; }}
    @media screen {{ body {{ background:#ececec; display:grid; place-items:start center; padding:16px 0; }} main {{ box-shadow:0 12px 32px rgba(23,48,34,.22); }} }}
  </style>
</head>
<body>
  <main>
    <div class="arch"></div><div class="leaf"></div>
    <img class="brand" src="rose-city-stays-logo-original.jpeg" alt="Rose City Stays">
    <p class="eyebrow">Your Tyler home away from home</p>
    <h1>Love this stay?<br><em>Come back direct.</em></h1>
    <div class="rule"></div>
    <p class="copy">Scan to explore every Rose City Stays home and make your next Tyler visit simple, personal, and direct.</p>
    <div class="qr-wrap"><img src="{qr_filename}" alt="QR code to book a future stay direct with Rose City Stays"></div>
    <div class="cta">SCAN TO BOOK DIRECT</div>
    <div class="url">WWW.ROSECITYSTAYS.COM</div>
    <div class="footer"><strong>SAVE THIS FOR YOUR NEXT TRIP</strong>Thank you for staying with Rose City Stays.</div>
  </main>
</body>
</html>'''
    output.write_text(html)


# General-purpose master sign.
make_qr(tracking_url(), root / "rose-city-stays-direct-booking-qr.png")
write_sign_html("rose-city-stays-direct-booking-qr.png", root / "rose-city-stays-direct-booking-sign-A5.html")

# Property-specific QR variants. The design remains the same but each scan is attributable in GA4.
variant_dir = root / "property-specific"
variant_dir.mkdir(exist_ok=True)
for property_id in property_ids:
    qr_name = f"rose-city-stays-direct-booking-qr-{property_id}.png"
    html_name = f"rose-city-stays-direct-booking-sign-A5-{property_id}.html"
    make_qr(tracking_url(property_id), variant_dir / qr_name)
    write_sign_html(f"property-specific/{qr_name}", root / html_name)

(root / "qr-tracking-manifest.txt").write_text(
    "Generic master sign\n" + tracking_url() + "\n\n" + "\n".join(
        f"{property_id}: {tracking_url(property_id)}" for property_id in property_ids
    ) + "\n"
)
print(f"Generated master sign and {len(property_ids)} property-specific QR variants.")
