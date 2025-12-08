import * as path from 'path';
import { trim } from 'lodash';
import {
  getFile,
  updateFolderFromArchive,
  updateFile,
} from '../src/utils/file-helper';
import { get } from '../src/utils/config';

const PATH_CONFIG = get('dir_path');
const TUTORIALS_CONFIG = get('tutorials');

const archiveUrl = new URL(
  `${trim(TUTORIALS_CONFIG.updateUrl, '/')}/${trim(TUTORIALS_CONFIG.zip, '/')}`,
).toString();

const buildInfoUrl = new URL(
  `${trim(TUTORIALS_CONFIG.updateUrl, '/')}/${trim(TUTORIALS_CONFIG.buildInfo, '/')}`,
).toString();

async function init() {
  try {
    // get archive
    const data = await getFile(archiveUrl);

    // extract archive to default folder
    await updateFolderFromArchive(PATH_CONFIG.defaultTutorials, data);

    // get build info
    const buildInfo = await getFile(buildInfoUrl);

    // save build info to default folder
    await updateFile(
      PATH_CONFIG.defaultTutorials,
      TUTORIALS_CONFIG.buildInfo,
      buildInfo,
    );

    process.exit(0);
  } catch (e) {
    console.error(
      'Something went wrong trying to get default tutorials archive',
      e,
    );
    process.exit(1);
  }
}

init();
