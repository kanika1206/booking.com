// Stock photos for the India catalogue, all from Unsplash (free under the Unsplash License).
// Each destination has its own outdoor set; rooms and pools share generic sets.

export const photo = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const DESTINATION: Record<string, string[]> = {
  goa: [
    '1512343879784-a960bf40e7f2', // Goa coastline
    '1614082242765-7c98ca0f3df3', // beach huts under palms
    '1519046904884-53103b34b206', // palm and white sand
    '1754221716275-98a22753a39d', // empty beach at sunrise
    '1656155316674-d8fab9e65eab', // Fontainhas, Panaji
    '1507525428034-b723cf961d3e', // shoreline
    '1473116763249-2faaef81ccda', // beach at dusk
  ],
  jaipur: [
    '1477587458883-47145ed94245', // Hawa Mahal street
    '1603262110263-fb0112e7cc33', // Hawa Mahal facade
    '1599661046289-e31897846e41', // Amber Fort walls
    '1582998451055-5ce52763e246', // haveli balconies
    '1632641252948-ccbc2fb7d6e9', // haveli courtyard
    '1682414181885-a22c7a922cd7', // old haveli
  ],
  manali: [
    '1692719058797-2954b100c8fe', // snow, cedars and peaks
    '1677820915334-d7ceba1e844a', // Solang Valley ridge
    '1609920658906-8223bd289001', // river through cedar forest
    '1590265788376-5d99eb11976e', // Hadimba Temple
    '1640078374440-17125e5f3016', // valley under cloud
    '1621496770858-d9aacf27f513', // monastery in town
    '1626621341517-bbf3d9990a23', // snowfield trek
  ],
  jaisalmer: [
    '1759498059971-2f08746a2197', // the golden fort
    '1767725885743-d3c4f8c2d570', // carved sandstone havelis
    '1654245363109-b873bb61b2fa', // camels in the dunes
    '1709620220232-12ecd7ca33a8', // camel at sunset
    '1778842810393-b97b8a29f69c', // sandstone lane
    '1713349881676-594b95a5742b', // fort above the town
    '1473580044384-7ba9967e16a0', // dunes
  ],
  udaipur: [
    '1695956353120-54ce5e91632b', // City Palace on Lake Pichola
    '1770665567859-129bbd144038', // the lake at dusk
    '1784620434437-8b33a3d62638', // rooftop pool at sunset
    '1759387758817-1a1861261963', // palace courtyard
    '1615836245337-f5b9b2303f10', // palace from the water
  ],
  rishikesh: [
    '1712510817140-917938f92e5b', // temples along the Ganges
    '1607406374368-809f8ec7f118', // Shiva statue in the river
    '1603867106100-0d2039fc8757', // rafting below the ghats
  ],
  munnar: [
    '1491497895121-1334fc14d8c9', // misty tea gardens
    '1629813538702-64c925934e19', // tea hills at dusk
    '1782580358831-647066d75f5a', // road through the estates
    '1778497555033-19cee34aa6b6', // estate village
    '1766671965039-8bc8687390ad', // lake at sunrise
  ],
  alleppey: [
    '1593693411515-c20261bcad6e', // houseboat on the backwaters
    '1704365159747-1f7b8913044f', // canal from above
    '1720445821834-1db9c765cb82', // houseboat under palms
    '1661174607003-d9d36388c916', // boats at the jetty
    '1593693401060-9fc28cf9e368', // palm-lined channel
  ],
  varanasi: [
    '1561359313-0639aad49ca6', // ghats and temples
    '1561361058-c24cecae35ca', // boats at the river steps
    '1705952484283-19c31e37e0e4', // evening aarti
    '1762513839526-c596f5e99a9a', // riverfront
    '1596097825168-c9b773f404ff', // boats at sunrise
  ],
  pondicherry: [
    '1772633634752-7b7611e839fc', // yellow house in White Town
    '1569157087866-f4a8e9250605', // colonial hotel facade
    '1774144799433-c93abe4bc8c2', // pink church tower
    '1787370241526-18b515332c6b', // French Quarter cafe
    '1566303052303-b2d2a9f16f0a', // the promenade rocks
  ],
  darjeeling: [
    '1671711847762-b8308b444a42', // the toy train
    '1776405876488-c8a0f8af09f7', // town below the snow line
    '1590256518627-c9f8a6855185', // Kanchenjunga at sunrise
    '1776405876570-63f340cec9e1', // hillside hotels
    '1765419102897-0f2328de11e2', // tea estate road
  ],
  mumbai: [
    '1785768569545-a0b75d68006f', // Gateway of India and the Taj
    '1569758267239-d08deb78bb1a', // Bandra-Worli Sea Link
    '1788439248724-5e384228948d', // old Mumbai street
    '1566552881560-0be862a7c445', // municipal building in the rain
    '1567157577867-05ccb1388e66', // Marine Drive
  ],
};

const ROOMS = [
  '1618773928121-c32242e63f39', '1590490360182-c33d57733427', '1631049307264-da0ec9d70304',
  '1611892440504-42a792e24d32', '1578683010236-d716f9a3f461', '1595576508898-0ad5c879a061',
  '1522771739844-6a9f6d5f14af', '1505693416388-ac5ce068fe85', '1609766857041-ed402ea8069a',
];

const POOLS = [
  '1571003123894-1f0594d2b5d9', '1582268611958-ebfd161ef9cf', '1613490493576-7fde63acd811',
  '1540541338287-41700207dee6', '1520250497591-112f2f40a3f4', '1584132967334-10e028bd69f7',
  '1566073771259-6a8506099945',
];

/** Covers chosen by hand where a stay's name points at a specific place. */
const COVERS: Record<string, string> = {
  'Casa Fontainhas': '1656155316674-d8fab9e65eab',
  'Agonda Shore Huts': '1614082242765-7c98ca0f3df3',
  'Cola Beach Lagoon Tents': '1754221716275-98a22753a39d',
  'Amber Courtyard Haveli': '1582998451055-5ce52763e246',
  'Pink City Suites': '1603262110263-fb0112e7cc33',
  'Old Manali Cedar Lodge': '1692719058797-2954b100c8fe',
  'Solang Valley Retreat': '1677820915334-d7ceba1e844a',
  'Golden Fort Haveli': '1759498059971-2f08746a2197',
  'Sam Dunes Camp': '1654245363109-b873bb61b2fa',
  'Lake Pichola Palace Haveli': '1695956353120-54ce5e91632b',
  'Aravalli Sunset Resort': '1784620434437-8b33a3d62638',
  'Ambrai Ghat Homestay': '1615836245337-f5b9b2303f10',
  'Ganga View Retreat': '1712510817140-917938f92e5b',
  'Laxman Jhula Yoga House': '1607406374368-809f8ec7f118',
  'Shivpuri Riverside Camp': '1603867106100-0d2039fc8757',
  'Tea Valley Bungalow': '1491497895121-1334fc14d8c9',
  'Misty Hills Resort': '1766671965039-8bc8687390ad',
  'Kanan Devan Homestay': '1782580358831-647066d75f5a',
  'Vembanad Houseboats': '1593693411515-c20261bcad6e',
  'Kumarakom Lake Villas': '1720445821834-1db9c765cb82',
  'Marari Palm Cottages': '1593693401060-9fc28cf9e368',
  'Ghat House Varanasi': '1561359313-0639aad49ca6',
  'Kashi Heritage Hotel': '1762513839526-c596f5e99a9a',
  'Rue Romain Rolland Villa': '1569157087866-f4a8e9250605',
  'Promenade Sea Hotel': '1566303052303-b2d2a9f16f0a',
  'Auroville Earth Huts': '1772633634752-7b7611e839fc',
  'Kanchenjunga View Hotel': '1590256518627-c9f8a6855185',
  'Happy Valley Tea Estate Stay': '1765419102897-0f2328de11e2',
  'Toy Train Guesthouse': '1671711847762-b8308b444a42',
  'Colaba Sea Palace': '1785768569545-a0b75d68006f',
  'Bandra Bay Apartments': '1569758267239-d08deb78bb1a',
  'Fort District Hostel': '1566552881560-0be862a7c445',
};

export const destinationPhoto = (slug: string) => photo(DESTINATION[slug]![0]!);

/**
 * One photo per illustration "scene" the design used, so the gallery keeps its shape.
 * `index` staggers the picks, so neighbouring stays don't open on the same picture.
 */
export function propertyPhotos(name: string, dest: string, scenes: string[], index: number) {
  const used = new Set<string>();
  return scenes.map((scene, i) => {
    const pool = scene === 'room' ? ROOMS : scene === 'pool' ? POOLS : DESTINATION[dest]!;
    let id = i === 0 ? COVERS[name] : undefined;
    for (let k = 0; (!id || used.has(id)) && k < pool.length; k++) id = pool[(index * 2 + i + k) % pool.length]!;
    // A small set can run out; borrow from the generic sets rather than repeat a photo.
    if (!id || used.has(id)) id = [...ROOMS, ...POOLS].find((x) => !used.has(x))!;
    used.add(id);
    return { url: photo(id), alt: `${name}, ${scene}` };
  });
}
