let acorn = require("acorn");

const APP = {
  name: "Paimon Wish Convertor",
  version: "1.0.0",
  uigf_version: "v2.2",
  base_id: "16657239000",
  urls: {
    locale_zh:
      "https://cdn.jsdelivr.net/gh/MadeBaruna/paimon-moe@main/src/locales/items/zh.json",
    characters:
      "https://cdn.jsdelivr.net/gh/MadeBaruna/paimon-moe@main/src/data/characters.js",
    weapons:
      "https://cdn.jsdelivr.net/gh/MadeBaruna/paimon-moe@main/src/data/weaponList.js",
  },
  gacha_types: {
    "wish-counter-beginners": 100,
    "wish-counter-standard": 200,
    "wish-counter-character-event": 301,
    "wish-counter-weapon-event": 302,
  },
};

const Dict = {
  weapon: "武器",
  character: "角色",
};

const Rarity = {};

const Accounts = [];

const btnSubmit = document.getElementById("submit");

window.addEventListener(
  "load",
  async (e) => {
    const items_zh = JSON.parse(await fetchFromURL(APP.urls.locale_zh));
    let charactersjs = await fetchFromURL(APP.urls.characters);
    let weaponsjs = await fetchFromURL(APP.urls.weapons);

    let charactersjs_parsed = acorn.parse(charactersjs, {
      ecmaVersion: 2020,
      sourceType: "module",
    });
    let exportDelaration;
    for (const expression of charactersjs_parsed.body) {
      if (expression.type === "ExportNamedDeclaration") {
        exportDelaration = expression;
        break;
      }
    }
    let characters_properties =
      exportDelaration.declaration.declarations[0].init.properties;

    //loop through properties to get character_id: name
    for (const char of characters_properties) {
      if (char.value.type === "ObjectExpression") {
        let id;
        let name;
        let rarity;
        for (const prop of char.value.properties) {
          if (prop.key.name === "id") id = prop.value.value;
          else if (prop.key.name === "name") name = prop.value.value;
          else if (prop.key.name === "rarity") rarity = prop.value.value;
        }
        if (id && name && rarity) {
          if (Object.hasOwnProperty.call(items_zh, name))
            Dict[id] = items_zh[name];
          else Dict[id] = name;
          Rarity[id] = rarity.toString();
        }
      }
    }

    let weaponsjs_parsed = acorn.parse(weaponsjs, {
      ecmaVersion: 2020,
      sourceType: "module",
    });

    let exportDelaration2;
    for (const expression of weaponsjs_parsed.body) {
      if (expression.type === "ExportNamedDeclaration") {
        exportDelaration2 = expression;
        break;
      }
    }
    let weapons_properties =
      exportDelaration2.declaration.declarations[0].init.properties;

    //loop through properties to get character_id: name
    for (const weap of weapons_properties) {
      if (weap.value.type === "ObjectExpression") {
        let id;
        let name;
        let rarity;
        for (const prop of weap.value.properties) {
          if (prop.key.name === "id") id = prop.value.value;
          else if (prop.key.name === "name") name = prop.value.value;
          else if (prop.key.name === "rarity") rarity = prop.value.value;
        }
        if (id && name && rarity) {
          if (Object.hasOwnProperty.call(items_zh, name))
            Dict[id] = items_zh[name];
          else Dict[id] = name;
          Rarity[id] = rarity.toString();
        }
      }
    }
  },
  false
);

btnSubmit.addEventListener(
  "click",
  async (e) => {
    Accounts.length = 0;
    const selectedFile = document.getElementById("file").files[0];
    if (!selectedFile) {
      alert("No file selected!");
      return;
    }
    const file = await selectedFile.text();
    convert(file);
    
    // create download buttons
    const outputDiv = document.getElementById('output')
    outputDiv.innerHTML = '';
    for (const account of Accounts) {
      const filename = account.uid + ".json"
      const downloadDiv = document.createElement('div');
      downloadDiv.className = "download";
      downloadDiv.innerText = filename;

      const downloadBtn = document.createElement('button');
      downloadBtn.innerText = "Download";
      downloadBtn.onclick = ()=>{
        donwloadString(JSON.stringify(account.uigf), "application/json", filename)
      };
      downloadDiv.appendChild(downloadBtn);
      outputDiv.appendChild(downloadDiv);
    }
  },
  false
);

function convert(file) {
  file = JSON.parse(file);
  if (Object.hasOwnProperty.call(file, "wish-uid")) {
    const uid = file["wish-uid"].toString();
    Accounts.push(new Account("main", uid));
  } else {
    Accounts.push(new Account("main"));
  }

  if (Object.hasOwnProperty.call(file, "accounts")) {
    const accs = file["accounts"].split(",");
    for (const acc of accs) {
      let uid = "null";
      if (Object.hasOwnProperty.call(file, acc + "-wish-uid"))
        uid = file[acc + "-wish-uid"].toString();
      Accounts.push(new Account(acc, uid));
    }
  }

  populate_uigf_list(file);
}

function populate_uigf_list(file) {
  // iterate accounts
  for (const account of Accounts) {
    // iterate banners
    for (const banner in APP.gacha_types) {
      let account_banner_key = (account.name === "main") ? banner : account.name + "-" + banner;
      if (
        Object.hasOwnProperty.call(APP.gacha_types, banner) &&
        Object.hasOwnProperty.call(file, account_banner_key)
      ) {
        // fill pulls
        for (const pull of file[account_banner_key].pulls) {
          let code;
          if (Object.hasOwnProperty.call(pull, "code")) code = pull.code;
          else code = APP.gacha_types[banner];
          account.AddWish(code, pull.time, pull.id, pull.type);
        }
      }
    }
    // sort pulls by timestamp
    account.uigf.list.sort((lf, rt) =>{
      let lf_time = new Date(lf.time).getTime();
      let rt_time = new Date(rt.time).getTime();
      if (lf_time < rt_time) return -1;
      if (lf_time > rt_time) return 1;
      return 0;
    })

    // write ids
    let last_id = 10000000;
    for (const pull of account.uigf.list) {
      last_id++;
      pull.id += last_id.toString();
    }

  }
}

class Account {
  name = "";
  uid = "";
  uigf;
  constructor(name, uid) {
    this.name = name;
    this.uid = uid || "null";
    this.uigf = UIGF(name, this.uid);
  }

  AddWish(gacha_type, time, name, item_type) {
    gacha_type = gacha_type.toString()
    this.uigf.list.push({
      uigf_gacha_type: gacha_type === "400" ? "301" : gacha_type,
      uid: this.uid,
      gacha_type: gacha_type,
      count: "1",
      time: time,
      name: translate(name),
      lang: "zh-cn",
      item_type: translate(item_type),
      rank_type: Rarity[name],
      id: APP.base_id,
    });
  }
}

function UIGF(name, uid) {
  let time = new Date();
  let uigf = {
    info: {
      uid: uid,
      lang: "zh-cn",
      export_time:
        time.toLocaleDateString("en-ca") +
        " " +
        time.toLocaleTimeString("zh-cn"),
      export_timestamp: Math.floor(time.getTime() / 1000),
      export_app: APP.name,
      export_app_version: APP.version,
      uigf_version: APP.uigf_version,
    },
    list: [],
  };
  return uigf;
}

function translate(name) {
  // translate item name
  if (Object.hasOwnProperty.call(Dict, name)) {
    return Dict[name];
  } else {
    console.error("no translation for", name);
    return name;
  }
}

function donwloadString(text, fileType, fileName) {
  var blob = new Blob([text], { type: fileType });

  var a = document.createElement('a');
  a.download = fileName;
  a.href = URL.createObjectURL(blob);
  a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 1500);
}

async function fetchFromURL(url) {
  const request = new Request(url);
  const response = await fetch(request);
  const string = await response.text();
  return string;
}