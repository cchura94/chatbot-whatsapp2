const {
  useMultiFileAuthState,
  makeWASocket,
  DisconnectReason,
  makeInMemoryStore,

} = require("@whiskeysockets/baileys");
const fs = require("fs");
const Contacto = require("./models/Contacto");

const express = require("express");

const app = express();
app.use(express.static("public"));

app.get("/api/contactos", async function (req, res) {
  const contactos = await Contacto.findAll();
  return res.status(200).json(contactos);
});

app.post("/api/contactos/:id/saldo", async function (req, res) {
  const { saldo } = req.body; // Asegúrate de que el cuerpo tenga este campo

  if (saldo === undefined) {
    return res.status(400).json({ message: "Se requiere el saldo pendiente" });
  }

  try {
    const contacto = await Contacto.findByPk(req.params.id);
    if (contacto) {
      contacto.saldo = saldo; // Actualiza el saldo
      await contacto.save(); // Guarda los cambios
      return res.status(200).json(contacto);
    } else {
      return res.status(404).json({ message: "Contacto no encontrado" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al actualizar el saldo", error });
  }
});

app.listen(3000, () => {
  console.log("Servidor iniciado en: http://127.0.0.1:3000");
});

const store = makeInMemoryStore({});
// can be read from a file
store.readFromFile("./baileys_store.json");
// saves the state to a file every 10s
setInterval(() => {
  store.writeToFile("./baileys_store.json");
}, 10_000);

const userContexts = {};
const menuData = {
  main: {
    message: "!Hola! 👋 ¿Cómo puedo ayudarte hoy?",
    options: {
      A: {
        text: "Información sobre citas 📅",
        respuesta:
          "Puedes agendar una cita llamando al *+59173277937* 📞 o visitando nuestra página web.",
      },
      B: {
        text: "Información sobre servicios médicos 🏥",
        submenu: "servicios",
      },
      C: {
        text: "Hablar con un médico 🩺",
        respuesta: "En un momento un médico se pondrá en contacto contigo. 😊",
      },
      D: {
        text: "Urgencias 🚑",
        submenu: "urgencias",
      },
    },
  },
  servicios: {
    message: "*Servicios Médicos Disponibles* 🏥",
    options: {
      1: {
        text: "Consulta general 👩‍⚕️",
        respuesta: "Ofrecemos consultas generales con médicos certificados. ✨",
      },
      2: {
        text: "Especialidades médicas 👨‍⚕️",
        submenu: "especialidades",
      },
      3: {
        text: "Volver al menú principal 🔙",
        submenu: "main",
      },
    },
  },
  especialidades: {
    message: "*Nuestras Especialidades* 🔍",
    options: {
      1: {
        text: "Cardiología ❤️",
        respuesta:
          "Contamos con un equipo de cardiólogos altamente calificados.",
      },
      2: {
        text: "Pediatría 👶",
        respuesta: "Brindamos atención especializada para los más pequeños.",
      },
      3: {
        text: "Dermatología 🌟",
        respuesta:
          "Ofrecemos tratamientos para todo tipo de condiciones de piel.",
      },
      4: {
        text: "Volver a servicios médicos 🔙",
        submenu: "servicios",
      },
    },
  },
  urgencias: {
    message: "*Atención de Urgencias* 🚑",
    options: {
      1: {
        text: "Atención inmediata 🚨",
        respuesta:
          "Si tienes una emergencia, acude a nuestro servicio de urgencias o llama al *+59173277937*.",
      },
      2: {
        text: "Consejos de primeros auxilios 🩹",
        respuesta:
          "Si necesitas ayuda inmediata, sigue estos consejos de primeros auxilios: [enlace a consejos].",
      },
      3: {
        text: "Volver al menú principal 🔙",
        submenu: "main",
      },
    },
  },
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  const sock = makeWASocket({
    syncFullHistory: true,
    auth: state,
    printQRInTerminal: true,
  });

  store.bind(sock.ev);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(
        "connection closed due to ",
        lastDisconnect.error,
        ", reconnecting ",
        shouldReconnect
      );
      // reconnect if not logged out
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("opened connection");
    }
  });

  async function sendMenu(sock, userId, menuKey) {
    // ubicacion
    await sock.sendMessage(userId, {
      location: { degreesLatitude: 24.121231, degreesLongitude: 55.1121221 },
    });

    // send a contact!
    const vcard =
      "BEGIN:VCARD\n" + // metadata of the contact card
      "VERSION:3.0\n" +
      "FN:Jeff Singh\n" + // full name
      "ORG:Ashoka Uni;\n" + // the organization of the contact
      "TEL;type=CELL;type=VOICE;waid=911234567890:+91 12345 67890\n" + // WhatsApp ID + phone number
      "END:VCARD";

    const sentMsg = await sock.sendMessage(userId, {
      contacts: {
        displayName: "Jeff",
        contacts: [{ vcard }],
      },
    });

    await sock.sendMessage(userId, {
      video: fs.readFileSync("./Media/ma_gif.mp4"),
      caption: "Hole les envío un video de ejemplo de typescript!",
      gifPlayback: false,
      ptv: false, // if set to true, will send as a `video note`
    });

    // send an audio file
    await sock.sendMessage(userId, {
      audio: { url: "Media/sonata.mp3" }
    });
    // enviar pdf

    await sock.sendMessage(userId, {
      document: {
        url: "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf"
      },
      fileName: "Su nombre de archivo",
      caption: "Le envio su archivo"
    })

    let lista_contactos = await Contacto.findAll();
    for (let i = 0; i < lista_contactos.length; i++) {
      const cont = lista_contactos[i];

      await sock.sendMessage(cont.numero, {
        text: "Este es un mensaje masivo de prueba...",
      });

      await sleep(3000)
      
    }

    let deudapendiente = "";
    const contacto = await Contacto.findOne({ where: { numero: userId } });
    if (contacto.saldo > 0) {
      deudapendiente = `Hola ${contacto.nombre}, recuerda que tiene una *deuda pendiente* a cancelar con monto de: *${contacto.saldo}*\n`;
    }

    const menu = menuData[menuKey];
    const optionsText = Object.entries(menu.options)
      .map(([key, option]) => `- 👉 *${key}*. ${option.text}`)
      .join("\n");

    const menuMensaje = `${deudapendiente}\n${menu.message}\n${optionsText}\n\n> *Indícanos qué opción te interesa* 😊.`;

    await sock.sendMessage(userId, {
      text: menuMensaje,
    });
  }

  sock.ev.on("messages.upsert", async (m) => {
    console.log(JSON.stringify(m, undefined, 2));
    const msg = m.messages[0];
    const userId = m.messages[0].key.remoteJid;
    const nombre = msg.pushName;

    const mensaje = msg.message?.conversation || msg.message?.text;

    if (!msg.key.fromMe) {
      let contacto = await Contacto.findOne({
        where: {
          numero: userId,
        },
      });

      console.log(contacto);

      if (!contacto) {
        contacto = await Contacto.create({
          nombre: nombre,
          numero: userId,
        });
      }

      if (!userContexts[userId]) {
        userContexts[userId] = { currentMenu: "main" };
        sendMenu(sock, userId, "main");
        return;
      }

      const currentMenu = userContexts[userId].currentMenu;
      const menu = menuData[currentMenu];

      const selectedOpcion = menu.options[mensaje];

      if (selectedOpcion) {
        if (selectedOpcion.respuesta) {
          await sock.sendMessage(userId, {
            text: selectedOpcion.respuesta,
          });
        }
        if (selectedOpcion.submenu) {
          userContexts[userId].currentMenu = selectedOpcion.submenu;
          sendMenu(sock, userId, selectedOpcion.submenu);
        }
      } else {
        // console.log("replying to", m.messages[0].key.remoteJid);
        await sock.sendMessage(m.messages[0].key.remoteJid, {
          text: "Por favor, elige un opción valida del menú",
        });
      }
    }
  });
}
// run in main file
connectToWhatsApp();
