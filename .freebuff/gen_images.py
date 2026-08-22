from PIL import Image, ImageDraw, ImageFilter
import random, math, os

OUT = "public/images"
os.makedirs(f"{OUT}/banners", exist_ok=True)
os.makedirs(f"{OUT}/categories", exist_ok=True)

def grad(d, box, c1, c2):
    x0,y0,x1,y1 = box
    for i in range(y1-y0):
        r = i/max(1,y1-y0-1)
        c = tuple(int(c1[j]+(c2[j]-c1[j])*r) for j in range(3))
        d.line([(x0,y0+i),(x1,y0+i)], fill=c)

def cr(d, cx, cy, r, f):
    d.ellipse([cx-r,cy-r,cx+r,cy+r], fill=f)

def rr(d, box, rad, f):
    d.rounded_rectangle(box, radius=rad, fill=f)

def noise(img, n=3):
    px = img.load()
    w,h = img.size
    for _ in range(w*h//5):
        x,y = random.randint(0,w-1), random.randint(0,h-1)
        r,g,b = px[x,y][:3]
        d = random.randint(-n,n)
        px[x,y] = (max(0,min(255,r+d)),max(0,min(255,g+d)),max(0,min(255,b+d)))

print("Generating images...")

# HERO
w,h = 1200,800
hero = Image.new("RGB",(w,h))
dd = ImageDraw.Draw(hero)
grad(dd,(0,0,w,h),(215,200,180),(190,175,155))
grad(dd,(0,550,w,h),(165,145,120),(145,125,105))
dd.line([(0,550),(w,550)],fill=(155,135,115),width=2)
rr(dd,(600,40,950,350),8,(225,220,210))
dd.rectangle([610,50,940,340],fill=(240,235,225))
dd.line([(775,50),(775,340)],fill=(205,200,190),width=3)
dd.line([(610,195),(940,195)],fill=(205,200,190),width=3)
for i in range(60):
    dd.line([(610+i*4,340),(775-i,h)],fill=(248,243,233))
rr(dd,(80,380,550,540),20,(200,185,165))
rr(dd,(80,300,550,400),15,(205,190,170))
rr(dd,(90,390,540,530),12,(210,195,175))
rr(dd,(60,320,120,540),10,(195,180,160))
rr(dd,(120,320,220,390),15,(185,170,150))
rr(dd,(380,320,480,390),15,(180,165,145))
rr(dd,(250,460,500,540),5,(145,115,85))
dd.rectangle([270,540,280,580],fill=(135,105,75))
dd.rectangle([470,540,480,580],fill=(135,105,75))
rr(dd,(350,420,380,465),5,(165,150,130))
cr(dd,365,415,12,(170,155,135))
dd.rectangle([1050,300,1080,540],fill=(125,105,80))
for i in range(5):
    a = math.radians(60+i*30)
    lx = 1065+math.cos(a)*80
    ly = 300-math.sin(a)*80
    dd.ellipse([lx-20,ly-30,lx+20,ly+10], fill=(90+random.randint(-10,10),115+random.randint(-10,10),75+random.randint(-10,10)))
hero = hero.filter(ImageFilter.GaussianBlur(1))
noise(hero,3)
hero.save(f"{OUT}/banners/hero.jpg", quality=90)
print(f"  hero.jpg ({os.path.getsize(f'{OUT}/banners/hero.jpg')} bytes)")

# CATEGORIES
cats = [
    ("wall-decor", (215,205,190)),
    ("laundry", (210,200,185)),
    ("comforters", (220,210,195)),
    ("lamps", (225,215,200)),
    ("carpets", (200,190,175)),
    ("accessories", (215,205,190)),
    ("clocks", (210,200,185)),
]
for slug, bg in cats:
    cw,ch = 600,600
    img = Image.new("RGB",(cw,ch))
    d = ImageDraw.Draw(img)
    grad(d,(0,0,cw,ch), bg, tuple(c-15 for c in bg))
    if slug == "wall-decor":
        rr(d,(150,80,450,350),5,(240,235,225))
        rr(d,(165,95,435,335),3,(185,170,150))
        cr(d,300,200,55,(165,145,125))
        cr(d,260,230,35,(180,160,140))
        cr(d,340,180,25,(155,135,115))
        rr(d,(180,380,280,480),3,(235,230,220))
        rr(d,(320,380,420,480),3,(235,230,220))
    elif slug == "laundry":
        rr(d,(180,150,420,420),15,(175,155,130))
        rr(d,(195,165,405,400),10,(185,165,140))
        for y in range(180,390,15):
            d.line([(200,y),(400,y)],fill=(170,150,125),width=1)
        for x in range(210,400,15):
            d.line([(x,170),(x,395)],fill=(170,150,125),width=1)
        rr(d,(220,130,320,180),8,(200,190,175))
        rr(d,(280,120,380,170),8,(190,180,165))
    elif slug == "comforters":
        rr(d,(80,250,520,480),10,(205,190,170))
        rr(d,(90,260,510,470),8,(215,200,180))
        rr(d,(100,220,220,280),12,(230,220,205))
        rr(d,(230,220,350,280),12,(230,220,205))
        rr(d,(360,220,480,280),12,(225,215,200))
        for y in range(270,460,30):
            d.line([(100,y),(500,y)],fill=(210,195,175),width=1)
    elif slug == "lamps":
        d.rectangle([280,200,320,400],fill=(165,150,130))
        rr(d,(260,390,340,420),5,(155,140,120))
        d.polygon([(220,200),(380,200),(350,100),(250,100)],fill=(235,225,210))
        d.polygon([(225,200),(375,200),(345,105),(255,105)],fill=(240,230,215))
        for r in range(60,0,-3):
            d.ellipse([300-r,200-r//2,300+r,200+r],fill=(248,243,230))
    elif slug == "carpets":
        rr(d,(80,150,520,450),8,(170,150,125))
        rr(d,(100,170,500,430),5,(180,160,135))
        d.rectangle([110,180,490,420],outline=(160,140,115),width=3)
        d.rectangle([120,190,480,410],outline=(160,140,115),width=1)
        cr(d,300,300,75,(185,165,140))
        cr(d,300,300,55,(175,155,130))
        cr(d,300,300,35,(190,170,145))
        for cx,cy in [(160,230),(440,230),(160,370),(440,370)]:
            cr(d,cx,cy,18,(180,160,135))
    elif slug == "accessories":
        rr(d,(150,300,450,400),8,(165,150,130))
        d.polygon([(250,300),(350,300),(330,180),(270,180)],fill=(180,165,145))
        d.ellipse([265,150,335,190],fill=(185,170,150))
        d.rectangle([380,240,410,300],fill=(225,220,210))
        cr(d,395,235,5,(245,205,125))
        rr(d,(170,250,220,300),5,(175,160,140))
    elif slug == "clocks":
        cr(d,300,280,115,(240,235,225))
        cr(d,300,280,110,(245,240,230))
        cr(d,300,280,105,(248,243,235))
        for i in range(12):
            a = math.radians(i*30-90)
            x1 = 300+math.cos(a)*90
            y1 = 280+math.sin(a)*90
            x2 = 300+math.cos(a)*100
            y2 = 280+math.sin(a)*100
            d.line([(x1,y1),(x2,y2)],fill=(145,130,110),width=3)
        d.line([(300,280),(300,205)],fill=(105,90,70),width=4)
        d.line([(300,280),(345,265)],fill=(105,90,70),width=3)
        cr(d,300,280,5,(105,90,70))
    img = img.filter(ImageFilter.GaussianBlur(0.5))
    noise(img,2)
    img.save(f"{OUT}/categories/{slug}.jpg", quality=90)
    print(f"  {slug}.jpg ({os.path.getsize(f'{OUT}/categories/{slug}.jpg')} bytes)")

print("Done!")
