/** Fila persistente e worker assíncrono da integração Senior. */
const SENIOR_QUEUE_PREFIX = 'SENIOR_QUEUE_';
const SENIOR_QUEUE_SCHEDULED = 'SENIOR_QUEUE_SCHEDULED';
const SENIOR_QUEUE_WORKER = 'processarFilaSenior';
const SENIOR_WORKER_LIMIT_MS = 4 * 60 * 1000;

function criarFilaSenior_(colaboradores, executionId) {
  const queueId = Utilities.getUuid();
  const file = DriveApp.createFile('senior-fila-' + queueId + '.json', JSON.stringify({ colaboradores: colaboradores }), MimeType.JSON);
  const metadata = { fileId: file.getId(), executionId: executionId, total: colaboradores.length, next: 0, processed: 0, errors: 0, createdAt: new Date().toISOString() };
  const props = PropertiesService.getScriptProperties();
  try {
    props.setProperty(SENIOR_QUEUE_PREFIX + queueId, JSON.stringify(metadata));
    agendarWorkerSenior_(props);
  } catch (error) {
    file.setTrashed(true);
    throw error;
  }
  return queueId;
}

function agendarWorkerSenior_(props) {
  if (props.getProperty(SENIOR_QUEUE_SCHEDULED)) return;
  ScriptApp.newTrigger(SENIOR_QUEUE_WORKER).timeBased().after(1000).create();
  props.setProperty(SENIOR_QUEUE_SCHEDULED, new Date().toISOString());
}

/** Função acionada automaticamente após o POST. */
function processarFilaSenior() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const props = PropertiesService.getScriptProperties();
    props.deleteProperty(SENIOR_QUEUE_SCHEDULED);
    const startedAt = Date.now();
    const queues = Object.keys(props.getProperties()).filter(key => key.indexOf(SENIOR_QUEUE_PREFIX) === 0).sort();
    queues.forEach(key => {
      if (Date.now() - startedAt < SENIOR_WORKER_LIMIT_MS) processarUmaFilaSenior_(key, props, startedAt);
    });
    if (Object.keys(props.getProperties()).some(key => key.indexOf(SENIOR_QUEUE_PREFIX) === 0)) agendarWorkerSenior_(props);
  } finally {
    lock.releaseLock();
  }
}

function processarUmaFilaSenior_(key, props, startedAt) {
  const queue = JSON.parse(props.getProperty(key));
  const colaboradores = JSON.parse(DriveApp.getFileById(queue.fileId).getBlob().getDataAsString()).colaboradores || [];
  while (queue.next < colaboradores.length && Date.now() - startedAt < SENIOR_WORKER_LIMIT_MS) {
    try {
      gravarColaboradorFirebase_(colaboradores[queue.next]);
      queue.processed++;
    } catch (error) {
      queue.errors++;
      console.error({ event: 'SENIOR_FIREBASE_ERROR', queue_id: key.substring(SENIOR_QUEUE_PREFIX.length), index: queue.next, error: error.message });
    }
    queue.next++;
    props.setProperty(key, JSON.stringify(queue));
  }
  if (queue.next >= colaboradores.length) {
    DriveApp.getFileById(queue.fileId).setTrashed(true);
    props.deleteProperty(key);
    console.info({ event: 'SENIOR_QUEUE_COMPLETE', queue_id: key.substring(SENIOR_QUEUE_PREFIX.length), total: queue.total, processed: queue.processed, errors: queue.errors });
  }
}
