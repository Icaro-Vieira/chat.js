let app = require("http").createServer(resposta); // Criando o servidor
let fs = require("fs"); // Sistema de arquivos
let io = require("socket.io")(app); // Socket.IO
let usuarios = []; // Lista de usuários
let ultimas_mensagens = []; // Lista com ultimas mensagens enviadas no chat

app.listen(3000); // Porta que está sendo executada

console.log("Aplicação está em execução...");

// Função principal de resposta as requisições do servidor
function resposta(req, res) {
  let arquivo = "";

  if (req.url == "/") {
    arquivo = __dirname + "/index.html";
  } else {
    arquivo = __dirname + req.url;
  }

  fs.readFile(arquivo, function (err, data) {
    if (err) {
      res.writeHead(404);
      return res.end("Página ou arquivo não encontrados");
    }

    res.writeHead(200);
    res.end(data);
  });
}

io.on("connection", function (socket) {
  // Método de resposta ao evento de entrar
  socket.on("entrar", function (apelido, callback) {
    if (!(apelido in usuarios)) {
      socket.apelido = apelido;
      usuarios[apelido] = socket; // Adicionadno o nome de usuário a lista armazenada no servidor

      // Enviar para o usuário ingressante as ultimas mensagens armazenadas.
      for (indice in ultimas_mensagens) {
        socket.emit("atualizar mensagens", ultimas_mensagens[indice]);
      }

      let mensagem =
        apelido + " entrou no chat";
      let obj_mensagem = { msg: mensagem, tipo: "sistema" };

      io.sockets.emit("atualizar usuarios", Object.keys(usuarios)); // Enviando a nova lista de usuários
      io.sockets.emit("atualizar mensagens", obj_mensagem); // Enviando mensagem anunciando entrada do novo usuário

      armazenaMensagem(obj_mensagem); // Guardando a mensagem na lista de histórico

      callback(true);
    } else {
      callback(false);
    }
  });

  socket.on("enviar mensagem", function (dados, callback) {
    let mensagem_enviada = dados.msg;
    let usuario = dados.usu;
    if (usuario == null) usuario = ""; // Caso não tenha um usuário, a mensagem será enviada para todos da sala

    mensagem_enviada =
      "( " +
      pegarDataAtual() +
      " ) " +
      socket.apelido +
      " diz: " +
      mensagem_enviada;
    let obj_mensagem = { msg: mensagem_enviada, tipo: "" };

    if (usuario == "") {
      io.sockets.emit("atualizar mensagens", obj_mensagem);
      armazenaMensagem(obj_mensagem); // Armazenando a mensagem
    } else {
      obj_mensagem.tipo = "privada";
      socket.emit("atualizar mensagens", obj_mensagem); // Emitindo a mensagem para o usuário que a enviou
      usuarios[usuario].emit("atualizar mensagens", obj_mensagem); // Emitindo a mensagem para o usuário escolhido
    }

    callback();
  });

  socket.on("disconnect", function () {
    delete usuarios[socket.apelido];
    let mensagem =
      socket.apelido + " saiu da sala";
    let obj_mensagem = { msg: mensagem, tipo: "sistema" };

    // No caso da saída de um usuário, a lista de usuários é atualizada
    // junto de um aviso em mensagem para os participantes da sala
    io.sockets.emit("atualizar usuarios", Object.keys(usuarios));
    io.sockets.emit("atualizar mensagens", obj_mensagem);

    armazenaMensagem(obj_mensagem);
  });
});

// Função para apresentar uma String com a data e hora em formato DD/MM/AAAA HH:MM:SS
function pegarDataAtual() {
  let dataAtual = new Date();
  let hora = (dataAtual.getHours() < 10 ? "0" : "") + dataAtual.getHours();
  let minuto =
    (dataAtual.getMinutes() < 10 ? "0" : "") + dataAtual.getMinutes();

  let dataFormatada =
    hora + ":" + minuto;
  return dataFormatada;
}

// Função para guardar as mensagens e seu tipo na letiável de ultimas mensagens
function armazenaMensagem(mensagem) {
  if (ultimas_mensagens.length > 5) {
    ultimas_mensagens.shift();
  }

  ultimas_mensagens.push(mensagem);
}
