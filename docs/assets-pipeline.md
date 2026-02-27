# Battle Assets Pipeline (Issue #23)

## 目标
为战斗场景建立可扩展的资源管线，支持：
- 单位/特效/音效统一登记
- 按设备能力分级加载（low/mid/high）
- 加载失败自动降级（fallback）

## 目录规范

```text
public/assets/
  manifest.json
  units/
  fx/
  audio/
```

## 清单规范
`public/assets/manifest.json`
- `version`: 资源版本
- `entries[]`: 每个资源定义
  - `id`
  - `kind` (`unit|fx|audio`)
  - `src`
  - `fallbackSrc` (可选)
  - `tier` (`low|mid|high`)

## 运行时策略
`lib/assets/pipeline.ts`
- `detectAssetTier()`：根据屏幕宽度和 deviceMemory 判断等级
- `loadManifest()`：加载清单；失败回退默认清单
- `selectAssets()`：按 tier 选择可加载资源
- `preloadAssets()`：预加载资源并在失败时尝试 fallback

## 后续扩展
1. 将单位/特效渲染从纯 CSS 点位替换为 Sprite/GIF/WebP 动画
2. 音效根据用户交互授权后再激活播放
3. 给 manifest 增加 hash 字段，配合缓存版本切换
