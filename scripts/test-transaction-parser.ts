
const sampleData = [
    {
        "date": "24/02/2022",
        "securitySymbol": "ASC",
        "securityName": "AL SHAHEER CORPORATION LIMITED",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1305243",
        "available": "0",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "24/02/2022",
        "securitySymbol": "ASC",
        "securityName": "AL SHAHEER CORPORATION LIMITED",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-694954",
        "available": "500",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "28/02/2022",
        "securitySymbol": "AVN",
        "securityName": "AVANCEON LIMITED",
        "transVolume": "100",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1388720",
        "available": "0",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "28/02/2022",
        "securitySymbol": "AVN",
        "securityName": "AVANCEON LIMITED",
        "transVolume": "100",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-738935",
        "available": "100",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "02/03/2022",
        "securitySymbol": "AVN",
        "securityName": "AVANCEON LIMITED",
        "transVolume": "30",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1462247",
        "available": "100",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "02/03/2022",
        "securitySymbol": "AVN",
        "securityName": "AVANCEON LIMITED",
        "transVolume": "30",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-781179",
        "available": "130",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "07/03/2022",
        "securitySymbol": "AVN",
        "securityName": "AVANCEON LIMITED",
        "transVolume": "45",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1567792",
        "available": "130",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "07/03/2022",
        "securitySymbol": "AVN",
        "securityName": "AVANCEON LIMITED",
        "transVolume": "45",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-842565",
        "available": "175",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "30/03/2022",
        "securitySymbol": "AVN",
        "securityName": "AVANCEON LIMITED",
        "transVolume": "25",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-2057840",
        "available": "175",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "30/03/2022",
        "securitySymbol": "AVN",
        "securityName": "AVANCEON LIMITED",
        "transVolume": "25",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1098902",
        "available": "200",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "07/02/2022",
        "securitySymbol": "DCR",
        "securityName": "DOLMEN CITY REIT",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-892546",
        "available": "0",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "07/02/2022",
        "securitySymbol": "DCR",
        "securityName": "DOLMEN CITY REIT",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-464331",
        "available": "500",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "24/11/2021",
        "securitySymbol": "EFERT",
        "securityName": "ENGRO FERTILIZERS LIMITED",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2021-11691845",
        "available": "0",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "24/11/2021",
        "securitySymbol": "EFERT",
        "securityName": "ENGRO FERTILIZERS LIMITED",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2021-5865802",
        "available": "500",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "06/12/2021",
        "securitySymbol": "EFERT",
        "securityName": "ENGRO FERTILIZERS LIMITED",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2021-12044148",
        "available": "500",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "06/12/2021",
        "securitySymbol": "EFERT",
        "securityName": "ENGRO FERTILIZERS LIMITED",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2021-6041136",
        "available": "1,000",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "30/03/2022",
        "securitySymbol": "EFERT",
        "securityName": "ENGRO FERTILIZERS LIMITED",
        "transVolume": "250",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-2034965",
        "available": "1,000",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "30/03/2022",
        "securitySymbol": "EFERT",
        "securityName": "ENGRO FERTILIZERS LIMITED",
        "transVolume": "250",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1092995",
        "available": "1,250",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "06/04/2022",
        "securitySymbol": "EFERT",
        "securityName": "ENGRO FERTILIZERS LIMITED",
        "transVolume": "220",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-2187887",
        "available": "1,250",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "06/04/2022",
        "securitySymbol": "EFERT",
        "securityName": "ENGRO FERTILIZERS LIMITED",
        "transVolume": "220",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1163081",
        "available": "1,470",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "21/04/2022",
        "securitySymbol": "EFERT",
        "securityName": "ENGRO FERTILIZERS LIMITED",
        "transVolume": "30",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-2606228",
        "available": "1,470",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "21/04/2022",
        "securitySymbol": "EFERT",
        "securityName": "ENGRO FERTILIZERS LIMITED",
        "transVolume": "30",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1380356",
        "available": "1,500",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "22/04/2022",
        "securitySymbol": "EFERT",
        "securityName": "ENGRO FERTILIZERS LIMITED",
        "transVolume": "40",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-2642198",
        "available": "1,500",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "22/04/2022",
        "securitySymbol": "EFERT",
        "securityName": "ENGRO FERTILIZERS LIMITED",
        "transVolume": "40",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1395642",
        "available": "1,540",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "17/03/2022",
        "securitySymbol": "EPCL",
        "securityName": "ENGRO POLYMER & CHEMICALS LIMITED",
        "transVolume": "150",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1825893",
        "available": "0",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "17/03/2022",
        "securitySymbol": "EPCL",
        "securityName": "ENGRO POLYMER & CHEMICALS LIMITED",
        "transVolume": "150",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-981513",
        "available": "150",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "18/03/2022",
        "securitySymbol": "EPCL",
        "securityName": "ENGRO POLYMER & CHEMICALS LIMITED",
        "transVolume": "160",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1848271",
        "available": "150",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "18/03/2022",
        "securitySymbol": "EPCL",
        "securityName": "ENGRO POLYMER & CHEMICALS LIMITED",
        "transVolume": "160",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-994505",
        "available": "310",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "01/04/2022",
        "securitySymbol": "EPCL",
        "securityName": "ENGRO POLYMER & CHEMICALS LIMITED",
        "transVolume": "81",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-2089371",
        "available": "310",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "01/04/2022",
        "securitySymbol": "EPCL",
        "securityName": "ENGRO POLYMER & CHEMICALS LIMITED",
        "transVolume": "81",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1119024",
        "available": "391",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "06/04/2022",
        "securitySymbol": "EPCL",
        "securityName": "ENGRO POLYMER & CHEMICALS LIMITED",
        "transVolume": "1",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-2183645",
        "available": "391",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "06/04/2022",
        "securitySymbol": "EPCL",
        "securityName": "ENGRO POLYMER & CHEMICALS LIMITED",
        "transVolume": "1",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1163249",
        "available": "392",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "20/04/2022",
        "securitySymbol": "EPCL",
        "securityName": "ENGRO POLYMER & CHEMICALS LIMITED",
        "transVolume": "1",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-2577418",
        "available": "392",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "20/04/2022",
        "securitySymbol": "EPCL",
        "securityName": "ENGRO POLYMER & CHEMICALS LIMITED",
        "transVolume": "6",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-2571828",
        "available": "392",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "20/04/2022",
        "securitySymbol": "EPCL",
        "securityName": "ENGRO POLYMER & CHEMICALS LIMITED",
        "transVolume": "7",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1351401",
        "available": "399",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "21/04/2022",
        "securitySymbol": "EPCL",
        "securityName": "ENGRO POLYMER & CHEMICALS LIMITED",
        "transVolume": "100",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-2604532",
        "available": "399",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "21/04/2022",
        "securitySymbol": "EPCL",
        "securityName": "ENGRO POLYMER & CHEMICALS LIMITED",
        "transVolume": "100",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1380626",
        "available": "499",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "26/04/2022",
        "securitySymbol": "EPCL",
        "securityName": "ENGRO POLYMER & CHEMICALS LIMITED",
        "transVolume": "50",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-2702570",
        "available": "499",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "26/04/2022",
        "securitySymbol": "EPCL",
        "securityName": "ENGRO POLYMER & CHEMICALS LIMITED",
        "transVolume": "50",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1422763",
        "available": "549",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "28/04/2022",
        "securitySymbol": "EPCL",
        "securityName": "ENGRO POLYMER & CHEMICALS LIMITED",
        "transVolume": "1",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-2771191",
        "available": "549",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "28/04/2022",
        "securitySymbol": "EPCL",
        "securityName": "ENGRO POLYMER & CHEMICALS LIMITED",
        "transVolume": "1",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1468589",
        "available": "550",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "11/02/2022",
        "securitySymbol": "HUBC",
        "securityName": "THE HUB POWER COMPANY LIMITED",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1013520",
        "available": "0",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "11/02/2022",
        "securitySymbol": "HUBC",
        "securityName": "THE HUB POWER COMPANY LIMITED",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-534767",
        "available": "500",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "24/02/2022",
        "securitySymbol": "HUBC",
        "securityName": "THE HUB POWER COMPANY LIMITED",
        "transVolume": "250",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1320905",
        "available": "500",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "24/02/2022",
        "securitySymbol": "HUBC",
        "securityName": "THE HUB POWER COMPANY LIMITED",
        "transVolume": "250",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-694905",
        "available": "750",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "01/03/2022",
        "securitySymbol": "HUBC",
        "securityName": "THE HUB POWER COMPANY LIMITED",
        "transVolume": "6",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1415850",
        "available": "750",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "01/03/2022",
        "securitySymbol": "HUBC",
        "securityName": "THE HUB POWER COMPANY LIMITED",
        "transVolume": "42",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1433955",
        "available": "750",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "01/03/2022",
        "securitySymbol": "HUBC",
        "securityName": "THE HUB POWER COMPANY LIMITED",
        "transVolume": "2",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1439860",
        "available": "750",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "01/03/2022",
        "securitySymbol": "HUBC",
        "securityName": "THE HUB POWER COMPANY LIMITED",
        "transVolume": "50",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-765217",
        "available": "800",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "10/03/2022",
        "securitySymbol": "KOHE",
        "securityName": "KOHINOOR ENERGY LIMITED",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1666535",
        "available": "0",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "10/03/2022",
        "securitySymbol": "KOHE",
        "securityName": "KOHINOOR ENERGY LIMITED",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-902545",
        "available": "500",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "13/04/2022",
        "securitySymbol": "KOHE",
        "securityName": "KOHINOOR ENERGY LIMITED",
        "transVolume": "489",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-2339491",
        "available": "500",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "13/04/2022",
        "securitySymbol": "KOHE",
        "securityName": "KOHINOOR ENERGY LIMITED",
        "transVolume": "11",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-2339497",
        "available": "500",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "13/04/2022",
        "securitySymbol": "KOHE",
        "securityName": "KOHINOOR ENERGY LIMITED",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1249986",
        "available": "1,000",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "26/04/2022",
        "securitySymbol": "KOHE",
        "securityName": "KOHINOOR ENERGY LIMITED",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-2693169",
        "available": "500",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "07/02/2022",
        "securitySymbol": "MEBL",
        "securityName": "MEEZAN BANK LIMITED",
        "transVolume": "100",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-911721",
        "available": "0",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "07/02/2022",
        "securitySymbol": "MEBL",
        "securityName": "MEEZAN BANK LIMITED",
        "transVolume": "100",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-464265",
        "available": "100",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "17/03/2022",
        "securitySymbol": "MEBL",
        "securityName": "MEEZAN BANK LIMITED",
        "transVolume": "35",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1819437",
        "available": "100",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "17/03/2022",
        "securitySymbol": "MEBL",
        "securityName": "MEEZAN BANK LIMITED",
        "transVolume": "35",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-981697",
        "available": "135",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "11/02/2022",
        "securitySymbol": "MZNPETF",
        "securityName": "MEEZAN PAKISTAN EXCHANGE TRADED FUND",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1024818",
        "available": "0",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "11/02/2022",
        "securitySymbol": "MZNPETF",
        "securityName": "MEEZAN PAKISTAN EXCHANGE TRADED FUND",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-534755",
        "available": "500",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "16/03/2022",
        "securitySymbol": "PICT",
        "securityName": "PAKISTAN INTERNATIONAL CONTAINER TERMINAL LIMITED",
        "transVolume": "100",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1806401",
        "available": "0",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "16/03/2022",
        "securitySymbol": "PICT",
        "securityName": "PAKISTAN INTERNATIONAL CONTAINER TERMINAL LIMITED",
        "transVolume": "100",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-967114",
        "available": "100",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "20/04/2022",
        "securitySymbol": "PICT",
        "securityName": "PAKISTAN INTERNATIONAL CONTAINER TERMINAL LIMITED",
        "transVolume": "100",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-2566581",
        "available": "100",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "20/04/2022",
        "securitySymbol": "PICT",
        "securityName": "PAKISTAN INTERNATIONAL CONTAINER TERMINAL LIMITED",
        "transVolume": "100",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1351499",
        "available": "200",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "15/03/2022",
        "securitySymbol": "SYS",
        "securityName": "SYSTEMS LIMITED",
        "transVolume": "9",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-1776280",
        "available": "0",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "15/03/2022",
        "securitySymbol": "SYS",
        "securityName": "SYSTEMS LIMITED",
        "transVolume": "9",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-955149",
        "available": "9",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "27/04/2022",
        "securitySymbol": "SYS",
        "securityName": "SYSTEMS LIMITED",
        "transVolume": "9",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2022-14",
        "available": "18",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "24/11/2021",
        "securitySymbol": "WAVES",
        "securityName": "WAVES CORPORATION LIMITED",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2021-11672870",
        "available": "0",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "24/11/2021",
        "securitySymbol": "WAVES",
        "securityName": "WAVES CORPORATION LIMITED",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2021-5865364",
        "available": "500",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "06/12/2021",
        "securitySymbol": "WAVES",
        "securityName": "WAVES CORPORATION LIMITED",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2021-12022990",
        "available": "500",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    },
    {
        "date": "06/12/2021",
        "securitySymbol": "WAVES",
        "securityName": "WAVES CORPORATION LIMITED",
        "transVolume": "500",
        "freeze": "0",
        "rowsCount": 72,
        "transId": "2021-6040427",
        "available": "1,000",
        "pendingIn": "0",
        "pledge": "0",
        "pendingOut": "0"
    }
]

function parseDate(dateStr: string) {
    const [day, month, year] = dateStr.split('/');
    return new Date(`${year}-${month}-${day}`);
}

function runTest() {
    console.log('Starting Transaction Parsing Test...');

    // Add original index to preserve order
    const dataWithIndex = sampleData.map((item, index) => ({ ...item, originalIndex: index }));

    // Group by symbol
    const bySymbol: Record<string, typeof dataWithIndex> = {};
    dataWithIndex.forEach(item => {
        if (!bySymbol[item.securitySymbol]) {
            bySymbol[item.securitySymbol] = [];
        }
        bySymbol[item.securitySymbol].push(item);
    });

    const detected: any[] = [];

    Object.entries(bySymbol).forEach(([symbol, transactions]) => {
        // Sort by date, then by original index
        transactions.sort((a, b) => {
            const dateA = parseDate(a.date).getTime();
            const dateB = parseDate(b.date).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return a.originalIndex - b.originalIndex;
        });

        let previousAvailable = 0;

        transactions.forEach((tx) => {
            const currentAvailable = parseInt(tx.available.replace(/,/g, ''), 10);
            const delta = currentAvailable - previousAvailable;

            if (delta > 0) {
                detected.push({
                    symbol: tx.securitySymbol,
                    type: 'BUY',
                    shares: delta,
                    date: tx.date
                });
            } else if (delta < 0) {
                detected.push({
                    symbol: tx.securitySymbol,
                    type: 'SELL',
                    shares: Math.abs(delta),
                    date: tx.date
                });
            }
            previousAvailable = currentAvailable;
        });
    });

    console.log('Detected Transactions:', JSON.stringify(detected, null, 2));

    // Assertions for new dataset

    // 1. DCR: 0 -> 500. Should be 1 Buy of 500.
    const dcrBuys = detected.filter(d => d.symbol === 'DCR' && d.type === 'BUY');
    const dcrTotal = dcrBuys.reduce((sum, d) => sum + d.shares, 0);
    console.log('DCR Total Buys:', dcrTotal);

    if (dcrTotal === 500) {
        console.log('✅ DCR Total Buys correct (500)');
    } else {
        console.error('❌ DCR Total Buys failed');
    }

    const dcrSells = detected.filter(d => d.symbol === 'DCR' && d.type === 'SELL');
    if (dcrSells.length === 0) {
        console.log('✅ DCR has NO Sells');
    } else {
        console.error('❌ DCR has Sells (Incorrect):', dcrSells);
    }

    // 2. ASC: 0 -> 500. Should be 1 Buy of 500.
    const ascBuys = detected.filter(d => d.symbol === 'ASC' && d.type === 'BUY');
    const ascTotal = ascBuys.reduce((sum, d) => sum + d.shares, 0);
    console.log('ASC Total Buys:', ascTotal);

    if (ascTotal === 500) {
        console.log('✅ ASC Total Buys correct (500)');
    } else {
        console.error('❌ ASC Total Buys failed');
    }

    // 3. KOHE: 
    // 10/03: 0 -> 500 (Buy 500)
    // 13/04: 500 -> 1000 (Buy 500)
    // 26/04: 1000 -> 500 (Sell 500)
    // Total Buy: 1000. Total Sell: 500.

    const koheBuys = detected.filter(d => d.symbol === 'KOHE' && d.type === 'BUY');
    const koheTotalBuy = koheBuys.reduce((sum, d) => sum + d.shares, 0);
    console.log('KOHE Total Buys:', koheTotalBuy);

    if (koheTotalBuy === 1000) {
        console.log('✅ KOHE Total Buys correct (1000)');
    } else {
        console.error('❌ KOHE Total Buys failed');
    }

    const koheSells = detected.filter(d => d.symbol === 'KOHE' && d.type === 'SELL');
    const koheTotalSell = koheSells.reduce((sum, d) => sum + d.shares, 0);
    console.log('KOHE Total Sells:', koheTotalSell);

    if (koheTotalSell === 500) {
        console.log('✅ KOHE Total Sells correct (500)');
    } else {
        console.error('❌ KOHE Total Sells failed');
    }
}

runTest();
