// ============================================================
// TEPS Mock Data Layer
// Central source of truth for all mock content.
// Replace individual exports with real Supabase fetches when ready.
// ============================================================

export type PropertyCategory = "Rent" | "Sale" | "Rent-to-Own";
export type PricePeriod = "month" | "year" | "one-off";
export type UserRole = "client" | "owner" | "agent" | "admin";
export type TicketStatus = "Open" | "In Progress" | "Resolved";
export type VerificationStatus = "Verified" | "Pending" | "Failed";

// ─── Regions ────────────────────────────────────────────────

export interface Region {
    id: string;
    name: string;
    capitalCity: string;
    constituencyCount: number;
    activeListings: number;
}

export const REGIONS: Region[] = [
    { id: "greater-accra", name: "Greater Accra", capitalCity: "Accra", constituencyCount: 29, activeListings: 1842 },
    { id: "ashanti", name: "Ashanti", capitalCity: "Kumasi", constituencyCount: 46, activeListings: 967 },
    { id: "western", name: "Western", capitalCity: "Takoradi", constituencyCount: 23, activeListings: 534 },
    { id: "eastern", name: "Eastern", capitalCity: "Koforidua", constituencyCount: 28, activeListings: 312 },
    { id: "central", name: "Central", capitalCity: "Cape Coast", constituencyCount: 23, activeListings: 289 },
    { id: "volta", name: "Volta", capitalCity: "Ho", constituencyCount: 25, activeListings: 178 },
    { id: "northern", name: "Northern", capitalCity: "Tamale", constituencyCount: 16, activeListings: 143 },
    { id: "upper-east", name: "Upper East", capitalCity: "Bolgatanga", constituencyCount: 15, activeListings: 87 },
    { id: "upper-west", name: "Upper West", capitalCity: "Wa", constituencyCount: 11, activeListings: 64 },
    { id: "bono", name: "Bono", capitalCity: "Sunyani", constituencyCount: 12, activeListings: 112 },
    { id: "ahafo", name: "Ahafo", capitalCity: "Goaso", constituencyCount: 6, activeListings: 45 },
    { id: "bono-east", name: "Bono East", capitalCity: "Techiman", constituencyCount: 11, activeListings: 78 },
    { id: "north-east", name: "North East", capitalCity: "Nalerigu", constituencyCount: 6, activeListings: 32 },
    { id: "oti", name: "Oti", capitalCity: "Dambai", constituencyCount: 9, activeListings: 28 },
    { id: "savannah", name: "Savannah", capitalCity: "Damongo", constituencyCount: 7, activeListings: 19 },
    { id: "western-north", name: "Western North", capitalCity: "Sefwi Wiawso", constituencyCount: 9, activeListings: 41 },
];

// ─── Constituencies ────────────────────────────────────────

export interface Constituency {
    id: string;
    regionId: string;
    name: string;
    listingCount: number;
    districts: string[];
}

export const CONSTITUENCIES: Constituency[] = [
    {
        id: "ayawaso-west",
        regionId: "greater-accra",
        name: "Ayawaso West",
        listingCount: 142,
        districts: ["East Legon", "Shiashie", "Roman Ridge", "Dzorwulu", "Airport Residential"],
    },
    {
        id: "okaikwei-north",
        regionId: "greater-accra",
        name: "Okaikwei North",
        listingCount: 89,
        districts: ["Abeka", "Okuase", "Lapaz", "Abelempkpe"],
    },
    {
        id: "ablekuma-central",
        regionId: "greater-accra",
        name: "Ablekuma Central",
        listingCount: 56,
        districts: ["Kaneshie", "Abossey Okai", "Darkuman"],
    },
    {
        id: "korle-klottey",
        regionId: "greater-accra",
        name: "Korle Klottey",
        listingCount: 204,
        districts: ["Osu", "Cantonments", "Ridge", "Adabraka", "Victoriaborg"],
    },
    {
        id: "nhyiaeso",
        regionId: "ashanti",
        name: "Nhyiaeso",
        listingCount: 78,
        districts: ["Nhyiaeso", "Asokwa", "Bomso", "Breman"],
    },
    {
        id: "oforikrom",
        regionId: "ashanti",
        name: "Oforikrom",
        listingCount: 63,
        districts: ["Airport", "Gyinyase", "Oforikrom"],
    },
    // Greater Accra (additional)
    { id: "tema-central", regionId: "greater-accra", name: "Tema Central", listingCount: 112, districts: ["Tema Community 1", "Tema Community 2"] },
    { id: "tema-east", regionId: "greater-accra", name: "Tema East", listingCount: 87, districts: ["Tema Community 4", "Tema Community 5"] },
    { id: "ledzokuku", regionId: "greater-accra", name: "Ledzokuku", listingCount: 95, districts: ["Teshie", "Nungua"] },
    { id: "krowor", regionId: "greater-accra", name: "Krowor", listingCount: 76, districts: ["Nungua", "Baatsona"] },
    { id: "la-dadekotopon", regionId: "greater-accra", name: "La Dadekotopon", listingCount: 134, districts: ["Labadi", "La"] },
    { id: "weija-gbawe", regionId: "greater-accra", name: "Weija-Gbawe", listingCount: 58, districts: ["Weija", "Gbawe", "Tetegu"] },
    { id: "ablekuma-north", regionId: "greater-accra", name: "Ablekuma North", listingCount: 67, districts: ["Ablekuma", "Sakaman"] },
    { id: "adenta", regionId: "greater-accra", name: "Adenta", listingCount: 92, districts: ["Adenta", "Ogbojo", "East Legon Hills"] },
    { id: "madina", regionId: "greater-accra", name: "Madina", listingCount: 81, districts: ["Madina", "Atomic"] },
    { id: "dome-kwabenya", regionId: "greater-accra", name: "Dome Kwabenya", listingCount: 74, districts: ["Dome", "Kwabenya", "Taifa"] },
    { id: "anyaa-sowutuom", regionId: "greater-accra", name: "Anyaa-Sowutuom", listingCount: 52, districts: ["Anyaa", "Sowutuom", "Ablekuma"] },
    // Ashanti (additional)
    { id: "asokwa", regionId: "ashanti", name: "Asokwa", listingCount: 88, districts: ["Asokwa", "Ahodwo"] },
    { id: "subin", regionId: "ashanti", name: "Subin", listingCount: 71, districts: ["Subin", "Adum"] },
    { id: "manhyia-south", regionId: "ashanti", name: "Manhyia South", listingCount: 54, districts: ["Manhyia", "Kentinkrono"] },
    { id: "manhyia-north", regionId: "ashanti", name: "Manhyia North", listingCount: 49, districts: ["Manhyia", "Dakwadwo"] },
    { id: "bantama", regionId: "ashanti", name: "Bantama", listingCount: 66, districts: ["Bantama", "Asafo", "Old Tafo"] },
    { id: "tafo", regionId: "ashanti", name: "Tafo", listingCount: 43, districts: ["Tafo Pankrono", "Tafo Nhyiaeso"] },
    { id: "suame", regionId: "ashanti", name: "Suame", listingCount: 82, districts: ["Suame", "Magazine", "Maakro"] },
    { id: "asawase", regionId: "ashanti", name: "Asawase", listingCount: 61, districts: ["Asawase", "Sawaba", "Aboabo"] },
    { id: "kwadaso", regionId: "ashanti", name: "Kwadaso", listingCount: 57, districts: ["Kwadaso", "Deduako", "Kenyasi"] },
    { id: "ejisu", regionId: "ashanti", name: "Ejisu", listingCount: 38, districts: ["Ejisu", "Besease", "Onwe"] },
    // Central
    { id: "cape-coast-south", regionId: "central", name: "Cape Coast South", listingCount: 94, districts: ["Cape Coast", "Kotokuraba"] },
    { id: "cape-coast-north", regionId: "central", name: "Cape Coast North", listingCount: 67, districts: ["Cape Coast", "Pedu"] },
    { id: "effutu", regionId: "central", name: "Effutu", listingCount: 52, districts: ["Winneba", "South Baifi"] },
    { id: "awutu-senya-east", regionId: "central", name: "Awutu-Senya East", listingCount: 48, districts: ["Kasoa", "Opeikuma"] },
    { id: "gomoa-east", regionId: "central", name: "Gomoa East", listingCount: 35, districts: ["Potsin", "Ojobi", "Nsaba"] },
    { id: "agona-west", regionId: "central", name: "Agona West", listingCount: 41, districts: ["Agona Swedru", "Nkum", "Bobi Nkwanta"] },
    { id: "assin-central", regionId: "central", name: "Assin Central", listingCount: 28, districts: ["Assin Fosu", "Assin Nyankomase"] },
    { id: "assin-north", regionId: "central", name: "Assin North", listingCount: 22, districts: ["Assin Bereku", "Assin Kushea"] },
    { id: "twifo-atti-morkwa", regionId: "central", name: "Twifo-Atti-Morkwa", listingCount: 19, districts: ["Twifo Praso", "Atti-Morkwa"] },
    { id: "upper-denkyira-east", regionId: "central", name: "Upper Denkyira East", listingCount: 25, districts: ["Dunkwa-on-Offin", "Kyekyewere"] },
    // Eastern
    { id: "abetifi", regionId: "eastern", name: "Abetifi", listingCount: 34, districts: ["Abetifi", "Pepease"] },
    { id: "akuapem-north", regionId: "eastern", name: "Akuapem North", listingCount: 47, districts: ["Akropong", "Amanokrom"] },
    { id: "akim-abuakwa-south", regionId: "eastern", name: "Akim Abuakwa South", listingCount: 42, districts: ["Kibi", "Asiakwa", "Tafo"] },
    { id: "asuogyaman", regionId: "eastern", name: "Asuogyaman", listingCount: 38, districts: ["Atimpoku", "Akosombo", "Senchi"] },
    { id: "atiwa-east", regionId: "eastern", name: "Atiwa East", listingCount: 29, districts: ["Kwabeng", "Anyinam", "Sekyere"] },
    { id: "lower-manya-krobo", regionId: "eastern", name: "Lower Manya Krobo", listingCount: 31, districts: ["Odumase", "Kpong", "Akuse"] },
    { id: "new-juaben-south", regionId: "eastern", name: "New Juaben South", listingCount: 56, districts: ["Koforidua", "Adweso", "Suhyen"] },
    { id: "nkawkaw", regionId: "eastern", name: "Nkawkaw", listingCount: 44, districts: ["Nkawkaw", "Atibie", "Dwerebeafe"] },
    { id: "suhum", regionId: "eastern", name: "Suhum", listingCount: 37, districts: ["Suhum", "Akorabo", "Adeiso"] },
    { id: "yilo-krobo", regionId: "eastern", name: "Yilo Krobo", listingCount: 26, districts: ["Somanya", "Kpong"] },
    // Western
    { id: "ahanta-west", regionId: "western", name: "Ahanta West", listingCount: 33, districts: ["Agona Nkwanta", "Dixcove", "Asemkaw"] },
    { id: "amenfi-east", regionId: "western", name: "Amenfi East", listingCount: 28, districts: ["Wassa Akropong", "Manso Amenfi"] },
    { id: "ellembelle", regionId: "western", name: "Ellembelle", listingCount: 19, districts: ["Nkroful", "Eikwe", "Baku"] },
    { id: "essikado-ketan", regionId: "western", name: "Essikado-Ketan", listingCount: 45, districts: ["Essikado", "Ketan", "Anaji"] },
    { id: "jomoro", regionId: "western", name: "Jomoro", listingCount: 22, districts: ["Half Assini", "Elubo", "Tikobo No.1"] },
    { id: "prestea-huni-valley", regionId: "western", name: "Prestea-Huni Valley", listingCount: 36, districts: ["Prestea", "Bogoso", "Huni Valley"] },
    { id: "sekondi", regionId: "western", name: "Sekondi", listingCount: 62, districts: ["Sekondi", "Effiakuma", "Ketan"] },
    { id: "shama", regionId: "western", name: "Shama", listingCount: 27, districts: ["Shama", "Aboadze", "Inchaban"] },
    { id: "takoradi", regionId: "western", name: "Takoradi", listingCount: 78, districts: ["Takoradi", "Market Circle", "Apremdo"] },
    { id: "tarkwa-nsuaem", regionId: "western", name: "Tarkwa-Nsuaem", listingCount: 41, districts: ["Tarkwa", "Nsuaem", "Huni Valley"] },
    // Volta
    { id: "adaklu", regionId: "volta", name: "Adaklu", listingCount: 18, districts: ["Adaklu Waya", "Adaklu Waya"] },
    { id: "afadjato-south", regionId: "volta", name: "Afadjato South", listingCount: 24, districts: ["Ve Golokati", "Liave", "Kpeve"] },
    { id: "akatsi-south", regionId: "volta", name: "Akatsi South", listingCount: 31, districts: ["Akatsi", "Deme", "Gefia"] },
    { id: "anlo", regionId: "volta", name: "Anlo", listingCount: 42, districts: ["Anloga", "Keta", "Agbozume"] },
    { id: "central-tongu", regionId: "volta", name: "Central Tongu", listingCount: 19, districts: ["Adidome", "Mafi Kumase", "Sogakope"] },
    { id: "ho-central", regionId: "volta", name: "Ho Central", listingCount: 68, districts: ["Ho", "Dome", "Bankoe"] },
    { id: "hohoe", regionId: "volta", name: "Hohoe", listingCount: 35, districts: ["Hohoe", "Wli", "Fodome"] },
    { id: "keta", regionId: "volta", name: "Keta", listingCount: 38, districts: ["Keta", "Anloga", "Agbozume"] },
    { id: "ketu-south", regionId: "volta", name: "Ketu South", listingCount: 44, districts: ["Denu", "Aflao", "Agbozume"] },
    { id: "north-tongu", regionId: "volta", name: "North Tongu", listingCount: 21, districts: ["Battor", "Mepe", "Sogakope"] },
    // Northern
    { id: "bimbilla", regionId: "northern", name: "Bimbilla", listingCount: 22, districts: ["Bimbilla", "Nakpayili", "Nambiri"] },
    { id: "gushegu", regionId: "northern", name: "Gushegu", listingCount: 18, districts: ["Gushegu", "Nayili", "Yizing"] },
    { id: "karaga", regionId: "northern", name: "Karaga", listingCount: 15, districts: ["Karaga", "Sang", "Pishe"] },
    { id: "sagnerigu", regionId: "northern", name: "Sagnerigu", listingCount: 48, districts: ["Sagnerigu", "Kpalsi", "Chogu"] },
    { id: "savelugu", regionId: "northern", name: "Savelugu", listingCount: 31, districts: ["Savelugu", "Mongol", "Alaa"] },
    { id: "tamale-central", regionId: "northern", name: "Tamale Central", listingCount: 72, districts: ["Tamale", "Kukuo", "Dungu"] },
    { id: "tamale-south", regionId: "northern", name: "Tamale South", listingCount: 58, districts: ["Tamale", "Chirifoyili", "Lamashegu"] },
    { id: "tolon", regionId: "northern", name: "Tolon", listingCount: 24, districts: ["Tolon", "Tali","Kpingla"] },
    { id: "yendi", regionId: "northern", name: "Yendi", listingCount: 27, districts: ["Yendi", "Nayeri", "Saboba"] },
    { id: "zabzugu", regionId: "northern", name: "Zabzugu", listingCount: 19, districts: ["Zabzugu", "Tatale", "Sheini"] },
    // Upper East
    { id: "bawku-central", regionId: "upper-east", name: "Bawku Central", listingCount: 26, districts: ["Bawku", "Garu", "Binduri"] },
    { id: "bolgatanga-central", regionId: "upper-east", name: "Bolgatanga Central", listingCount: 34, districts: ["Bolgatanga", "Zongo", "Yikene"] },
    { id: "bongo", regionId: "upper-east", name: "Bongo", listingCount: 21, districts: ["Bongo", "Soe", "Beo"] },
    { id: "builsa-north", regionId: "upper-east", name: "Builsa North", listingCount: 14, districts: ["Sandema", "Kori", "Chuchuliga"] },
    { id: "chiana-paga", regionId: "upper-east", name: "Chiana-Paga", listingCount: 16, districts: ["Paga", "Chiana", "Mirigu"] },
    { id: "garu", regionId: "upper-east", name: "Garu", listingCount: 12, districts: ["Garu", "Tempane", "Bunkpurugu"] },
    { id: "navrongo-central", regionId: "upper-east", name: "Navrongo Central", listingCount: 22, districts: ["Navrongo", "Paga", "Kologo"] },
    { id: "talensi", regionId: "upper-east", name: "Talensi", listingCount: 15, districts: ["Tongo", "Zonno", "Gbeogo"] },
    // Upper West
    { id: "jirapa", regionId: "upper-west", name: "Jirapa", listingCount: 18, districts: ["Jirapa", "Lambussie", "Hamile"] },
    { id: "lawra", regionId: "upper-west", name: "Lawra", listingCount: 14, districts: ["Lawra", "Nandom", "Tiiri"] },
    { id: "nadowli-kaleo", regionId: "upper-west", name: "Nadowli-Kaleo", listingCount: 12, districts: ["Nadowli", "Kaleo", "Tangasia"] },
    { id: "nandom", regionId: "upper-west", name: "Nandom", listingCount: 11, districts: ["Nandom", "Lawra", "Guo"] },
    { id: "sissala-east", regionId: "upper-west", name: "Sissala East", listingCount: 13, districts: ["Tumu", "Gwoare", "Nabolo"] },
    { id: "wa-central", regionId: "upper-west", name: "Wa Central", listingCount: 28, districts: ["Wa", "Kpaguri", "Nakori"] },
    { id: "wa-east", regionId: "upper-west", name: "Wa East", listingCount: 10, districts: ["Funsi", "Kulun", "Jambusi"] },
    { id: "wa-west", regionId: "upper-west", name: "Wa West", listingCount: 9, districts: ["Wechiau", "Bussie", "Issa"] },
    // Bono
    { id: "berekum-east", regionId: "bono", name: "Berekum East", listingCount: 32, districts: ["Berekum","Kato", "Kyinaho"] },
    { id: "dormaa-central", regionId: "bono", name: "Dormaa Central", listingCount: 28, districts: ["Dormaa Ahenkro", "Nsesereso", "Dormaa Akwamu"] },
    { id: "dormaa-east", regionId: "bono", name: "Dormaa East", listingCount: 19, districts: ["Wamfie", "Akontanim", "Dormaa"] },
    { id: "jaman-north", regionId: "bono", name: "Jaman North", listingCount: 17, districts: ["Sampa", "Goka", "Drobo"] },
    { id: "jaman-south", regionId: "bono", name: "Jaman South", listingCount: 22, districts: ["Drobo", "Japekrom", "Ndome"] },
    { id: "sunyani-east", regionId: "bono", name: "Sunyani East", listingCount: 41, districts: ["Sunyani", "Yamoah", "New Dormaa"] },
    { id: "sunyani-west", regionId: "bono", name: "Sunyani West", listingCount: 24, districts: ["Odumase", "Fiapre", "Kotokrom"] },
    { id: "wenchi", regionId: "bono", name: "Wenchi", listingCount: 18, districts: ["Wenchi", "Nchiraa", "Subinso"] },
    // Ahafo
    { id: "asunafo-north", regionId: "ahafo", name: "Asunafo North", listingCount: 16, districts: ["Goaso", "Ambereso", "Gyedu"] },
    { id: "asunafo-south", regionId: "ahafo", name: "Asunafo South", listingCount: 12, districts: ["Kukuom", "Acherensua", "Ahafoman"] },
    { id: "asutifi-north", regionId: "ahafo", name: "Asutifi North", listingCount: 14, districts: ["Kenyasi", "Acherensua", "Hwidiem"] },
    { id: "asutifi-south", regionId: "ahafo", name: "Asutifi South", listingCount: 11, districts: ["Hwidiem", "Kenyasi", "Atronie"] },
    { id: "tano-north", regionId: "ahafo", name: "Tano North", listingCount: 9, districts: ["Duayaw Nkwanta", "Sereso", "Susuan"] },
    { id: "tano-south", regionId: "ahafo", name: "Tano South", listingCount: 8, districts: ["Bechem", "Techimantia", "Nsuta"] },
    // Bono East
    { id: "kintampo-north", regionId: "bono-east", name: "Kintampo North", listingCount: 18, districts: ["Kintampo", "Jema", "Ampoma"] },
    { id: "kintampo-south", regionId: "bono-east", name: "Kintampo South", listingCount: 14, districts: ["Kintampo", "Jema", "Atta"] },
    { id: "nkoranza-north", regionId: "bono-east", name: "Nkoranza North", listingCount: 11, districts: ["Nkoranza", "Dromankese", "Busunya"] },
    { id: "nkoranza-south", regionId: "bono-east", name: "Nkoranza South", listingCount: 13, districts: ["Nkoranza", "Akonkrom", "Dromankese"] },
    { id: "pru-east", regionId: "bono-east", name: "Pru East", listingCount: 9, districts: ["Yeji", "Bianyanka", "Abease"] },
    { id: "pru-west", regionId: "bono-east", name: "Pru West", listingCount: 8, districts: ["Prang", "Abease", "Kete Krachi"] },
    { id: "techiman-north", regionId: "bono-east", name: "Techiman North", listingCount: 15, districts: ["Techiman", "Tuobodom", "Offuman"] },
    { id: "techiman-south", regionId: "bono-east", name: "Techiman South", listingCount: 19, districts: ["Techiman", "Tanoso", "Aworowa"] },
    { id: "ateibu-amantin", regionId: "bono-east", name: "Ateibu-Amantin", listingCount: 10, districts: ["Amantin", "Atebubu", "Mensah"] },
    // North East
    { id: "bunkpurugu", regionId: "north-east", name: "Bunkpurugu", listingCount: 11, districts: ["Bunkpurugu", "Yunyoo", "Nasuan"] },
    { id: "chereponi", regionId: "north-east", name: "Chereponi", listingCount: 8, districts: ["Chereponi", "Nalerigu", "Gambaga"] },
    { id: "mamprugu-moagduri", regionId: "north-east", name: "Mamprugu Moagduri", listingCount: 7, districts: ["Yagaba", "Kubori", "Jimbale"] },
    { id: "nalerigu-gambaga", regionId: "north-east", name: "Nalerigu-Gambaga", listingCount: 9, districts: ["Nalerigu", "Gambaga", "Langbinsi"] },
    { id: "walewale-east", regionId: "north-east", name: "Walewale East", listingCount: 12, districts: ["Walewale", "Janga", "Tanga"] },
    { id: "walewale-west", regionId: "north-east", name: "Walewale West", listingCount: 10, districts: ["Walewale", "Kukua", "Janga"] },
    { id: "yunyoo-nasuan", regionId: "north-east", name: "Yunyoo-Nasuan", listingCount: 6, districts: ["Yunyoo", "Nasuan", "Bunkpurugu"] },
    // Oti
    { id: "biakoye", regionId: "oti", name: "Biakoye", listingCount: 12, districts: ["Nkawkaw", "Bodada", "Badu"] },
    { id: "guan", regionId: "oti", name: "Guan", listingCount: 10, districts: ["Likpe", "Akadom", "Bodada"] },
    { id: "krachi-east", regionId: "oti", name: "Krachi East", listingCount: 14, districts: ["Dambai", "KpareKpare", "Boru"] },
    { id: "krachi-nchumuru", regionId: "oti", name: "Krachi Nchumuru", listingCount: 9, districts: ["Chinderi", "Borae", "Nkanchina"] },
    { id: "krachi-west", regionId: "oti", name: "Krachi West", listingCount: 11, districts: ["Kete Krachi", "Boso", "Ajena"] },
    { id: "nkwanta-north", regionId: "oti", name: "Nkwanta North", listingCount: 8, districts: ["Nkwanta", "Kpassa", "Brewaniase"] },
    { id: "nkwanta-south", regionId: "oti", name: "Nkwanta South", listingCount: 10, districts: ["Nkwanta", "Shiare", "Kete"] },
    // Savannah
    { id: "bole", regionId: "savannah", name: "Bole", listingCount: 11, districts: ["Bole", "Sawla", "Tuna"] },
    { id: "damongo", regionId: "savannah", name: "Damongo", listingCount: 13, districts: ["Damongo", "Canteen", "Laribanga"] },
    { id: "daboya-mankarigu", regionId: "savannah", name: "Daboya-Mankarigu", listingCount: 8, districts: ["Daboya", "Mankarigu", "Tulwei"] },
    { id: "salaga-north", regionId: "savannah", name: "Salaga North", listingCount: 9, districts: ["Salaga", "Kpatinga", "Kafaba"] },
    { id: "salaga-south", regionId: "savannah", name: "Salaga South", listingCount: 7, districts: ["Salaga", "Kpembe", "Kafaba"] },
    { id: "sawla-tuna-kalba", regionId: "savannah", name: "Sawla-Tuna-Kalba", listingCount: 6, districts: ["Sawla", "Tuna", "Kalba"] },
    { id: "yapei-kusawgu", regionId: "savannah", name: "Yapei-Kusawgu", listingCount: 8, districts: ["Yapei", "Kusawgu", "Tulwei"] },
    // Western North
    { id: "aowin", regionId: "western-north", name: "Aowin", listingCount: 14, districts: ["Enchi", "Nkronua", "Dadieso"] },
    { id: "bia-east", regionId: "western-north", name: "Bia East", listingCount: 11, districts: ["Sefwi Adabokrom", "Kunkumso", "Asuokoo"] },
    { id: "bia-west", regionId: "western-north", name: "Bia West", listingCount: 10, districts: ["Sefwi Debiso", "Dadieso", "Kunkumso"] },
    { id: "bibiani-anhwiaso-bekwai", regionId: "western-north", name: "Bibiani-Anhwiaso-Bekwai", listingCount: 17, districts: ["Bibiani", "Anhwiaso", "Bekwai"] },
    { id: "bodi", regionId: "western-north", name: "Bodi", listingCount: 9, districts: ["Bodi", "Sefwi Akontombra", "Sayeraso"] },
    { id: "juaboso", regionId: "western-north", name: "Juaboso", listingCount: 12, districts: ["Juaboso", "Bodi", "Sefwi Wiawso"] },
    { id: "sefwi-akontombra", regionId: "western-north", name: "Sefwi Akontombra", listingCount: 8, districts: ["Sefwi Akontombra", "Nkasawura", "Dadieso"] },
    { id: "sefwi-wiawso", regionId: "western-north", name: "Sefwi Wiawso", listingCount: 15, districts: ["Sefwi Wiawso", "Asawinso", "Kwamebim"] },
    { id: "suaman", regionId: "western-north", name: "Suaman", listingCount: 7, districts: ["Suaman", "Dadieso", "Enchi"] },
];

// ─── Properties ───────────────────────────────────────────

export interface VerificationChecks {
    ownership: { verified: boolean; date?: string };
    gpsLocation: { verified: boolean; date?: string };
    landCommission: { verified: boolean; date?: string };
}

export interface Property {
    id: string;
    title: string;
    description: string;
    price: number;
    pricePeriod: PricePeriod;
    category: PropertyCategory;
    bedrooms: number;
    bathrooms: number;
    sqft?: number;
    regionId: string;
    constituencyId: string;
    district: string;
    location: string;
    gpsCode: string;
    imageUrl: string;
    galleryImages: string[];
    isVerified: boolean;
    verificationChecks: VerificationChecks;
    referenceCode: string;
    ownerName: string;
    ownerInitials: string;
    yearBuilt: number;
    amenities: string[];
}

const gallerySet1 = [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=2074&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=2074&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?q=80&w=2070&auto=format&fit=crop",
];

const gallerySet2 = [
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?q=80&w=2071&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=2070&auto=format&fit=crop",
];

const gallerySet3 = [
    "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=2074&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1464082354059-27db6ce50048?q=80&w=2070&auto=format&fit=crop",
];

export const PROPERTIES: Property[] = [
    {
        id: "prop-east-legon-001",
        title: "Luxury Penthouse – East Legon",
        description:
            "Experience premium living in this fully furnished 4-bedroom penthouse in the exclusive East Legon neighbourhood. Floor-to-ceiling windows, a private rooftop terrace, chef's kitchen, and 24/7 manned security. Walking distance to top schools, restaurants, and the Accra Mall.",
        price: 12000,
        pricePeriod: "month",
        category: "Rent",
        bedrooms: 4,
        bathrooms: 3,
        sqft: 3800,
        regionId: "greater-accra",
        constituencyId: "ayawaso-west",
        district: "East Legon",
        location: "East Legon, Accra",
        gpsCode: "GA-182-9901",
        imageUrl: gallerySet1[0],
        galleryImages: gallerySet1,
        isVerified: true,
        verificationChecks: {
            ownership: { verified: true, date: "May 10, 2025" },
            gpsLocation: { verified: true, date: "May 12, 2025" },
            landCommission: { verified: true, date: "June 01, 2025" },
        },
        referenceCode: "TEPS-VRF-EL001",
        ownerName: "Kwame Asante",
        ownerInitials: "KA",
        yearBuilt: 2022,
        amenities: ["Swimming Pool", "Gym", "24/7 Security", "Generator", "Parking x2", "DSTV", "Wi-Fi", "Air Conditioning"],
    },
    {
        id: "prop-roman-ridge-001",
        title: "3-BR Executive Home – Roman Ridge",
        description:
            "A stunning 3-bedroom detached family home set in a tranquil, gated community in Roman Ridge. The property boasts a large garden, covered car port, and modern open-plan kitchen and dining area. Perfect for families or embassy staff.",
        price: 8500,
        pricePeriod: "month",
        category: "Rent",
        bedrooms: 3,
        bathrooms: 2,
        sqft: 2600,
        regionId: "greater-accra",
        constituencyId: "ayawaso-west",
        district: "Roman Ridge",
        location: "Roman Ridge, Accra",
        gpsCode: "GA-109-4421",
        imageUrl: gallerySet2[0],
        galleryImages: gallerySet2,
        isVerified: true,
        verificationChecks: {
            ownership: { verified: true, date: "March 15, 2025" },
            gpsLocation: { verified: true, date: "March 18, 2025" },
            landCommission: { verified: true, date: "April 02, 2025" },
        },
        referenceCode: "TEPS-VRF-RR001",
        ownerName: "Abena Mensah-Bonsu",
        ownerInitials: "AM",
        yearBuilt: 2019,
        amenities: ["Garden", "Car Port", "Borehole Water", "Generator", "Security", "Solar Panels"],
    },
    {
        id: "prop-cantonments-001",
        title: "4-BR Townhouse for Sale – Cantonments",
        description:
            "A rare opportunity to acquire a prestigious 4-bedroom townhouse in Cantonments, one of Accra's most coveted addresses. Spanning three floors with a rooftop lounge, marble finishes, and smart-home technology. Ideal as a primary residence or investment property.",
        price: 2800000,
        pricePeriod: "one-off",
        category: "Sale",
        bedrooms: 4,
        bathrooms: 4,
        sqft: 4500,
        regionId: "greater-accra",
        constituencyId: "korle-klottey",
        district: "Cantonments",
        location: "Cantonments, Accra",
        gpsCode: "GA-047-8812",
        imageUrl: gallerySet3[0],
        galleryImages: gallerySet3,
        isVerified: true,
        verificationChecks: {
            ownership: { verified: true, date: "January 20, 2025" },
            gpsLocation: { verified: true, date: "January 22, 2025" },
            landCommission: { verified: true, date: "February 10, 2025" },
        },
        referenceCode: "TEPS-VRF-CT001",
        ownerName: "Nana Ama Forson",
        ownerInitials: "NF",
        yearBuilt: 2021,
        amenities: ["Rooftop Lounge", "Smart Home System", "4 Parking Bays", "Staff Quarters", "Backup Generator", "Swimming Pool"],
    },
    {
        id: "prop-osu-001",
        title: "Rent-to-Own Studio – Osu",
        description:
            "A compact but beautifully designed studio apartment in the vibrant Osu neighbourhood. Fully furnished, all-inclusive bills, and on a Rent-to-Own scheme making this your first step on the property ladder.",
        price: 3200,
        pricePeriod: "month",
        category: "Rent-to-Own",
        bedrooms: 1,
        bathrooms: 1,
        sqft: 650,
        regionId: "greater-accra",
        constituencyId: "korle-klottey",
        district: "Osu",
        location: "Osu, Accra",
        gpsCode: "GA-205-3301",
        imageUrl: gallerySet1[1],
        galleryImages: [gallerySet1[1], gallerySet1[2], gallerySet2[1], gallerySet2[2]],
        isVerified: true,
        verificationChecks: {
            ownership: { verified: true, date: "June 05, 2025" },
            gpsLocation: { verified: true, date: "June 07, 2025" },
            landCommission: { verified: false },
        },
        referenceCode: "TEPS-VRF-OS001",
        ownerName: "Kofi Darko",
        ownerInitials: "KD",
        yearBuilt: 2023,
        amenities: ["Fully Furnished", "High-Speed Wi-Fi", "Air Conditioning", "Shared Gym", "Bills Included"],
    },
    {
        id: "prop-dzorwulu-001",
        title: "2-BR Modern Apartment – Dzorwulu",
        description:
            "A modern and well-maintained 2-bedroom apartment in a quiet part of Dzorwulu. Features include an open-plan living area, fitted kitchen, and a private balcony. Well connected to the airport and Accra CBD.",
        price: 5000,
        pricePeriod: "month",
        category: "Rent",
        bedrooms: 2,
        bathrooms: 2,
        sqft: 1400,
        regionId: "greater-accra",
        constituencyId: "ayawaso-west",
        district: "Dzorwulu",
        location: "Dzorwulu, Accra",
        gpsCode: "GA-157-6680",
        imageUrl: gallerySet2[2],
        galleryImages: [gallerySet2[2], gallerySet2[3], gallerySet1[3], gallerySet1[4]],
        isVerified: false,
        verificationChecks: {
            ownership: { verified: false },
            gpsLocation: { verified: true, date: "July 01, 2025" },
            landCommission: { verified: false },
        },
        referenceCode: "TEPS-VRF-DZ001",
        ownerName: "Ama Serwaa",
        ownerInitials: "AS",
        yearBuilt: 2020,
        amenities: ["Balcony", "Fitted Kitchen", "Security", "Parking"],
    },
    {
        id: "prop-airport-001",
        title: "Luxury Land Plot – Airport Residential",
        description:
            "A rare 0.5-acre land plot in the prestigious Airport Residential Area. Fully titled with Indenture and Site Plan. Ideal for residential or commercial development. Ready to build immediately.",
        price: 1500000,
        pricePeriod: "one-off",
        category: "Sale",
        bedrooms: 0,
        bathrooms: 0,
        sqft: 21780,
        regionId: "greater-accra",
        constituencyId: "ayawaso-west",
        district: "Airport Residential",
        location: "Airport Residential, Accra",
        gpsCode: "GA-099-1120",
        imageUrl: gallerySet3[1],
        galleryImages: [gallerySet3[1], gallerySet3[2], gallerySet3[3]],
        isVerified: true,
        verificationChecks: {
            ownership: { verified: true, date: "April 12, 2025" },
            gpsLocation: { verified: true, date: "April 14, 2025" },
            landCommission: { verified: true, date: "May 01, 2025" },
        },
        referenceCode: "TEPS-VRF-AR001",
        ownerName: "Ghana Property Holdings Ltd",
        ownerInitials: "GP",
        yearBuilt: 0,
        amenities: ["Fully Titled", "Site Plan Available", "Indenture", "Road Frontage"],
    },
    {
        id: "prop-ridge-001",
        title: "5-BR Mansion – Ridge",
        description:
            "An imposing 5-bedroom mansion in Ridge set on a half-acre compound. This exceptional property features a swimming pool, tennis court, staff quarters, and a double garage. Suitable for executives, embassies, or high-net-worth families.",
        price: 22000,
        pricePeriod: "month",
        category: "Rent",
        bedrooms: 5,
        bathrooms: 5,
        sqft: 6200,
        regionId: "greater-accra",
        constituencyId: "korle-klottey",
        district: "Ridge",
        location: "Ridge, Accra",
        gpsCode: "GA-041-5503",
        imageUrl: gallerySet3[2],
        galleryImages: gallerySet3,
        isVerified: true,
        verificationChecks: {
            ownership: { verified: true, date: "February 15, 2025" },
            gpsLocation: { verified: true, date: "February 17, 2025" },
            landCommission: { verified: true, date: "March 01, 2025" },
        },
        referenceCode: "TEPS-VRF-RG001",
        ownerName: "Colonial Estates Ltd",
        ownerInitials: "CE",
        yearBuilt: 2016,
        amenities: ["Swimming Pool", "Tennis Court", "Staff Quarters", "Double Garage", "Generator", "CCTV", "Borehole"],
    },
    {
        id: "prop-kumasi-nhyiaeso-001",
        title: "3-BR Executive Flat – Nhyiaeso",
        description:
            "A lovely 3-bedroom apartment on the top floor of a newly completed building in the executive Nhyiaeso area of Kumasi. Great views of the city, modern kitchen, and tile floors throughout.",
        price: 3800,
        pricePeriod: "month",
        category: "Rent",
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1750,
        regionId: "ashanti",
        constituencyId: "nhyiaeso",
        district: "Nhyiaeso",
        location: "Nhyiaeso, Kumasi",
        gpsCode: "AK-218-7702",
        imageUrl: gallerySet2[1],
        galleryImages: gallerySet2,
        isVerified: true,
        verificationChecks: {
            ownership: { verified: true, date: "July 10, 2025" },
            gpsLocation: { verified: true, date: "July 11, 2025" },
            landCommission: { verified: true, date: "July 20, 2025" },
        },
        referenceCode: "TEPS-VRF-NK001",
        ownerName: "Yaw Brobbey",
        ownerInitials: "YB",
        yearBuilt: 2024,
        amenities: ["Top Floor", "City Views", "Modern Kitchen", "Parking", "Security"],
    },
];

// ─── Data Access Helpers ───────────────────────────────────

export function getPropertyById(id: string): Property | undefined {
    return PROPERTIES.find((p) => p.id === id);
}

export function getPropertiesByConstituency(constituencyId: string): Property[] {
    return PROPERTIES.filter((p) => p.constituencyId === constituencyId);
}

export function getPropertiesByRegion(regionId: string): Property[] {
    return PROPERTIES.filter((p) => p.regionId === regionId);
}

export function getConstituenciesByRegion(regionId: string): Constituency[] {
    return CONSTITUENCIES.filter((c) => c.regionId === regionId);
}

export function getRegionById(id: string): Region | undefined {
    return REGIONS.find((r) => r.id === id);
}

export function getConstituencyById(id: string): Constituency | undefined {
    return CONSTITUENCIES.find((c) => c.id === id);
}

// ─── Featured Properties (for Home Page) ───────────────────

export const FEATURED_PROPERTIES: Property[] = PROPERTIES.filter((p) => p.isVerified).slice(0, 6);

// ─── Mock Users ────────────────────────────────────────────

export interface MockUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    phone: string;
    initials: string;
    joinedDate: string;
    savedProperties: string[];
}

export const MOCK_USERS: MockUser[] = [
    {
        id: "user-001",
        name: "Kwame Adams",
        email: "kwame@example.com",
        role: "client",
        phone: "+233 24 123 4567",
        initials: "KA",
        joinedDate: "January 2025",
        savedProperties: ["prop-east-legon-001", "prop-osu-001"],
    },
    {
        id: "user-002",
        name: "Ama Forson",
        email: "ama@teps.io",
        role: "owner",
        phone: "+233 20 987 6543",
        initials: "AF",
        joinedDate: "March 2024",
        savedProperties: [],
    },
    {
        id: "user-003",
        name: "Emmanuel Boateng",
        email: "eboateng@teps.io",
        role: "agent",
        phone: "+233 55 444 3322",
        initials: "EB",
        joinedDate: "November 2023",
        savedProperties: [],
    },
    {
        id: "user-admin",
        name: "Super Admin",
        email: "admin@teps.io",
        role: "admin",
        phone: "+233 50 000 0000",
        initials: "AD",
        joinedDate: "January 2024",
        savedProperties: [],
    },
];

export const LOGGED_IN_USER: MockUser = MOCK_USERS[0];

// ─── Service Tickets ───────────────────────────────────────

export interface ServiceTicket {
    id: string;
    propertyId: string;
    propertyTitle: string;
    issueType: string;
    status: TicketStatus;
    description: string;
    date: string;
}

export const CLIENT_TICKETS: ServiceTicket[] = [
    {
        id: "TKT-2025-001",
        propertyId: "prop-osu-001",
        propertyTitle: "Rent-to-Own Studio – Osu",
        issueType: "Plumbing",
        status: "In Progress",
        description: "The kitchen sink has a slow drain and the hot water pressure is low in the bathroom.",
        date: "July 15, 2025",
    },
    {
        id: "TKT-2025-002",
        propertyId: "prop-east-legon-001",
        propertyTitle: "Luxury Penthouse – East Legon",
        issueType: "Electrical",
        status: "Resolved",
        description: "Power socket in the main bedroom was sparking. Issue has been fixed by a licensed electrician.",
        date: "June 28, 2025",
    },
    {
        id: "TKT-2025-003",
        propertyId: "prop-east-legon-001",
        propertyTitle: "Luxury Penthouse – East Legon",
        issueType: "Air Conditioning",
        status: "Open",
        description: "The master bedroom A/C unit is not cooling sufficiently even on max settings.",
        date: "July 20, 2025",
    },
];

// ─── Mock Payment Receipts ─────────────────────────────────

export interface PaymentReceipt {
    id: string;
    propertyTitle: string;
    amount: number;
    date: string;
    reference: string;
    type: string;
    status: "Paid" | "Pending";
}

export const CLIENT_RECEIPTS: PaymentReceipt[] = [
    { id: "REC-001", propertyTitle: "Luxury Penthouse – East Legon", amount: 12000, date: "Jul 01, 2025", reference: "TEPS-PAY-EL001-JUL", type: "Rent", status: "Paid" },
    { id: "REC-002", propertyTitle: "Rent-to-Own Studio – Osu", amount: 3200, date: "Jul 01, 2025", reference: "TEPS-PAY-OS001-JUL", type: "Rent-to-Own Instalment", status: "Paid" },
    { id: "REC-003", propertyTitle: "Luxury Penthouse – East Legon", amount: 150, date: "Jun 15, 2025", reference: "TEPS-PAY-BV-EL001", type: "Booking Viewing Fee", status: "Paid" },
];

// ─── Agent Dashboard Data ──────────────────────────────────

export const AGENT_STATS = {
    activeLeads: 14,
    closedDealsThisMonth: 3,
    assignedRegion: "Greater Accra",
    coverageConstituencies: ["Ayawaso West", "Okaikwei North", "Korle Klottey"],
    pendingCommissions: 8400,
    totalEarned: 52000,
    commissionRate: 0.05,
    recentLeads: [
        { name: "Adjoa Bentil", property: "Luxury Penthouse – East Legon", status: "Viewing Booked", date: "Jul 18, 2025" },
        { name: "Kojo Mensah", property: "3-BR Executive Home – Roman Ridge", status: "Offer Made", date: "Jul 16, 2025" },
        { name: "Efua Taylor", property: "5-BR Mansion – Ridge", status: "New Lead", date: "Jul 20, 2025" },
        { name: "Kwesi Acheampong", property: "2-BR Modern Apartment – Dzorwulu", status: "Negotiating", date: "Jul 19, 2025" },
    ],
};

// ─── Agent Portal Specific Mock Data ───────────────────────

export const MOCK_AGENT_TICKETS = [
    {
        id: "TKT-2026-A01",
        clientName: "Kwame Adams",
        clientPhone: "+233 24 123 4567",
        type: "Guided Viewing",
        propertyTitle: "Luxury Penthouse – East Legon",
        propertyId: "prop-east-legon-001",
        location: "East Legon",
        status: "Open", // Open, En Route, Meeting, Completed
        scheduledFor: "Today, 14:00 GMT",
        notes: "Client wants to check the water pressure and rooftop access."
    },
    {
        id: "TKT-2026-A02",
        clientName: "Ama Serwaa",
        clientPhone: "+233 55 987 6543",
        type: "Property Search",
        propertyTitle: "N/A - Seeking 2BR in Cantonments",
        propertyId: null,
        location: "Cantonments",
        status: "En Route",
        scheduledFor: "Today, 16:30 GMT",
        notes: "Client has a budget of $1200/month. Prefers modern fittings."
    }
];

export const MOCK_AGENT_VERIFICATIONS = [
    {
        id: "SITE-VRF-001",
        propertyTitle: "3-BR Executive Home – Roman Ridge",
        location: "Roman Ridge",
        gpsCode: "GA-109-4421",
        status: "Pending Action", // Pending Action, Under Review, Verified
        deadline: "Tomorrow",
        checks: {
            photosMatch: false,
            boundaryWall: false,
            utilitiesConnected: false
        }
    },
    {
        id: "SITE-VRF-002",
        propertyTitle: "New Development – Airport Residential",
        location: "Airport Residential",
        gpsCode: "GA-099-1120",
        status: "Under Review",
        deadline: "Jul 25, 2025",
        checks: {
            photosMatch: true,
            boundaryWall: true,
            utilitiesConnected: true
        }
    }
];

export const MOCK_AGENT_LISTINGS = [
    {
        id: "LIST-001",
        title: "2-BR Modern Apartment – Dzorwulu",
        ownerName: "Ama Serwaa",
        price: 5000,
        period: "month",
        status: "Available", // Available, Under Offer, Off Market
        views: 142,
        enquiries: 5,
        dateAdded: "Jul 10, 2025"
    },
    {
        id: "LIST-002",
        title: "Rent-to-Own Studio – Osu",
        ownerName: "Kofi Darko",
        price: 3200,
        period: "month",
        status: "Under Offer",
        views: 310,
        enquiries: 12,
        dateAdded: "Jun 28, 2025"
    }
];// ─── Admin Moderation Queue ────────────────────────────────

export const MODERATION_QUEUE = [
    {
        id: "VRF-2026-089",
        propertyTitle: "4-BR Home – Tema Community 25",
        submittedBy: "Kwabena Poku",
        submittedDate: "Jul 20, 2025",
        idMatch: "98%",
        gpsCheck: "Confirmed",
        landComm: "Pending",
        status: "Awaiting Review",
    },
    {
        id: "VRF-2026-090",
        propertyTitle: "2-BR Apartment – Adjirigano",
        submittedBy: "Maame Sarpong",
        submittedDate: "Jul 19, 2025",
        idMatch: "87%",
        gpsCheck: "Confirmed",
        landComm: "Confirmed",
        status: "Awaiting Review",
    },
    {
        id: "VRF-2026-091",
        propertyTitle: "Land Plot – Spintex Road",
        submittedBy: "Nana Osei Ltd",
        submittedDate: "Jul 18, 2025",
        idMatch: "72%",
        gpsCheck: "Flagged",
        landComm: "Disputed",
        status: "Flagged",
    },
];

export const MOCK_AGENT_APPLICATIONS = [
    { id: "APP-001", name: "Abigail Osei", email: "abigail.o@gmail.com", experience: "3 years in East Legon", coverageAreas: ["Ayawaso West", "Korle Klottey"], status: "Pending", submittedDate: "Jul 21, 2025" },
    { id: "APP-002", name: "Kofi Ansah", email: "kofi@ansahrealestate.com", experience: "5 years", coverageAreas: ["Tema"], status: "Pending", submittedDate: "Jul 22, 2025" }
];

export const ACTION_LOGS = [
    { id: "AL-100", action: "Admin [Kwame] approved Listing [prop-osu-001]", timestamp: "Jul 23, 2025 14:00" },
    { id: "AL-099", action: "Admin [Kwame] suspended User [user-122]", timestamp: "Jul 23, 2025 11:30" },
    { id: "AL-098", action: "System: Triggered PDF Certificate for VRF-2026-088", timestamp: "Jul 22, 2025 09:15" },
];

// ─── Owner Dashboard Data ──────────────────────────────────

export const OWNER_PROPERTIES = PROPERTIES.filter(
    (p) => p.regionId === "greater-accra"
).slice(0, 4);

export const OWNER_STATS = {
    totalListings: 4,
    verifiedListings: 3,
    pendingVerification: 1,
    totalViews: 1842,
    monthlyViews: 312,
    bookingRequests: 7,
};

export const MOCK_TRUST_ENGINE_PROPERTIES = [
    {
        id: "TE-001",
        title: "2-BR Modern Apartment – Dzorwulu",
        location: "Dzorwulu, Accra",
        status: "pending_upload",
        tier: null
    },
    {
        id: "TE-002",
        title: "Retail Shop Space – Osu",
        location: "Osu, Accra",
        status: "admin_review",
        tier: "standard"
    },
    {
        id: "TE-003",
        title: "4-BR Townhouse – Cantonments",
        location: "Cantonments, Accra",
        status: "agent_visit",
        tier: "premium"
    }
];

export const MOCK_OWNER_PERFORMANCE_CHART = [
    { day: "Mon", impressions: 3200, engagements: 42 },
    { day: "Tue", impressions: 4100, engagements: 68 },
    { day: "Wed", impressions: 2800, engagements: 35 },
    { day: "Thu", impressions: 5600, engagements: 95 },
    { day: "Fri", impressions: 3800, engagements: 50 },
    { day: "Sat", impressions: 6100, engagements: 120 },
    { day: "Sun", impressions: 4800, engagements: 85 },
];

// ─── Client Portal Specific Mock Data ──────────────────────

export interface ClientServiceRequest {
    id: string;
    serviceType: "Property Search" | "Verification Request" | "Guided Viewing";
    propertyId?: string;
    propertyTitle?: string;
    status: "Payment Confirmed" | "Agent Assigned" | "Viewing Scheduled" | "Report Delivered";
    date: string;
    assignedAgent?: { name: string; avatarUrl?: string };
    viewingDate?: string;
}

export const MOCK_CLIENT_VAULT = [
    { propertyId: "prop-east-legon-001", note: "Price is negotiable. Check the water pressure." },
    { propertyId: "prop-osu-001", note: "Great location for the business." }
];

export const MOCK_CLIENT_SERVICE_REQUESTS: ClientServiceRequest[] = [
    {
        id: "SR-001",
        serviceType: "Guided Viewing",
        propertyId: "prop-roman-ridge-001",
        propertyTitle: "3-BR Executive Home – Roman Ridge",
        status: "Viewing Scheduled",
        date: "Jul 22, 2025",
        assignedAgent: { name: "Emmanuel Boateng" },
        viewingDate: "Jul 25, 2025 at 14:00"
    },
    {
        id: "SR-002",
        serviceType: "Property Search",
        status: "Agent Assigned",
        date: "Jul 23, 2025",
        assignedAgent: { name: "Ama Serwaa" }
    }
];
