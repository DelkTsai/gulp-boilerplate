/**
 * 提取babelify在转码的过程中所使用的helpers
 * browserify plugin
 * @author evan2x(evan2zaw@gmail.com)
 * @date 2015/12/12
 */

import fs from 'fs';
import babelify from 'babelify';
import through from 'through2';
import { transform, buildExternalHelpers } from 'babel-core';
import * as vueCompiler from 'vue-template-compiler';

export default function extractBabelHelpers(bundle, {
  outputType = 'global',
  output = function() {},
  es3 = true
} = {}) {
  if (!output) return;
  let usedHelpers = new Set();

  const noop = (chunk, enc, done) => {
    done(null, chunk);
  };

  const addHooks = () => {
    bundle.pipeline.get('pack').push(through.obj(noop, (done) => {
      let helpers = buildExternalHelpers(Array.from(usedHelpers), outputType);
      let options = {};

      if (es3) {
        options.plugins = [
          'transform-es3-member-expression-literals',
          'transform-es3-property-literals'
        ];
      }

      let ret = transform(helpers, options);

      output(ret.code);
      done();
    }));
  };

  bundle.on('transform', (tr, file) => {
    if (tr.vueify) {
      let content = fs.readFileSync(file, 'utf8');
      let parts = vueCompiler.parseComponent(content, { pad: true });

      if (parts.script) {
        try {
          let result = transform(parts.script.content, {
            ast: false,
            filename: file,
            comments: false,
            highlightCode: false,
            code: false
          });

          result.metadata.usedHelpers.forEach((method) => {
            usedHelpers.add(method);
          });

        // eslint-disable-next-line no-empty
        } catch (e) {}
      }
    }

    if (tr instanceof babelify) {
      tr.once('babelify', (result) => {
        result.metadata.usedHelpers.forEach((method) => {
          usedHelpers.add(method);
        });
      });
    }
  });

  bundle.on('reset', addHooks);
  addHooks();
}
