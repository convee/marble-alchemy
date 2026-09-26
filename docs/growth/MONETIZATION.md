# 变现账号准备记录

更新时间：2026-09-26

## Google AdSense

- 当前登录的 Google 账号 `convee.cn@gmail.com` 现场回读为“没有 AdSense 账号”。
- 已进入官方注册表单并填写公开网站地址 `https://chaoschemy.com/`。
- 表单显示需要核对收款地址国家/地区、电话号码、邮寄地址，并阅读 AdSense 条款。
- 没有提交注册、没有接受条款、没有输入电话、地址、税务或银行信息。
- 当前表单停在提交前；国家/地区下拉默认显示“美国”，不能把默认值当作法定收款地。
- 可接手位置：Chrome 中的 `Sign up – Google AdSense` 标签页；网站字段已经填好。

## Stripe

- 当前浏览器已有一个名为 `New business` 的 Stripe **沙盒测试账号**（页面明确标为 `Test`）；它只用于测试，不能接收真实付款。
- 当前登录的 Stripe 真实账户激活页实际显示业务所在地为 **新加坡**，并要求 UEN；它不是中国大陆账户，也不能把已有账户改填成中国大陆主体。
- Stripe 官方当前支持地区列表没有中国大陆；如果继续使用 Stripe，需要一个 Stripe 支持地区的合法主体、税号、实体地址、电话和实体银行账户。中国大陆主体不能直接作为这条 Stripe 收款路线的注册地。
- 没有在真实账户中选择国家、接受协议或输入企业/银行资料；也没有创建测试商品或价格，避免替项目擅自决定收费方案。
- 可接手位置：Chrome 中的 `注册并创建 Stripe 账户 | Stripe` 标签页；另有 `New business 沙盒` 测试控制台可用于后续集成演练。

### 中国大陆主体的替代路线

- Stripe 不能直接用中国大陆主体开通生产收款。可评估 Merchant of Record（MoR）路线；Paddle 的[中国支付方案](https://www.paddle.com/billing/china)面向中国企业，包含一次性付款、税务/退款/争议处理，并列出中国市场支付方式，但仍需按其审核、合同和结算规则现场确认。
- 已选择 Paddle Merchant of Record 作为中国大陆主体的一次性支持路线。Paddle 的一次性数字产品流程需要先创建商品和一次性价格，再通过 Hosted Checkout 或交易 checkout URL 收款；仍需完成账号审核、网站批准和结算资料核对。
- Paddle 账号已注册并进入 Live 控制台；已创建一次性商品 `Chaoschemy Workshop Support` 和 `$5 USD` 价格。`chaoschemy.com` 已提交网站批准，当前状态为 Pending。下一步是创建客户端 Token、完成域名批准并生成 `https://pay.paddle.io/checkout/` 链接，再写入 GitHub repository variable `PADDLE_PAYMENT_LINK`。

## 当前技术状态

- 首页、`guide.html` 和 `support.html` 已加载 `monetization-config.js`；配置为空时不会加载 AdSense、不显示支持按钮，也不会产生第三方支付请求。
- 支持入口由 `monetization.js` 动态插入；`analytics.js` 现在使用事件委托捕获动态入口的 `cta_click(target=support_click)`，因此启用支付后可以归因支持按钮点击。
- GitHub Pages 构建会从 repository variables 读取 `STRIPE_PAYMENT_LINK`、`PADDLE_PAYMENT_LINK`、`PADDLE_CLIENT_TOKEN`、`ADSENSE_CLIENT`、`ADSENSE_SLOT`，生成公开配置文件；这些值不是秘密，但只能在账号持有人完成审核后写入。
- Pages 构建在配置 `ADSENSE_CLIENT` 后会自动生成 `ads.txt`；为空时删除该文件，避免发布无效的广告授权声明。
- 支持链接只接受 Stripe `https://buy.stripe.com/` 或 Paddle Hosted Checkout `https://pay.paddle.io/checkout/` 前缀；Paddle 客户端 Token 只接受 `live_` 前缀；AdSense 仅接受 `ca-pub-` publisher ID 和广告位 ID，避免误把测试地址或任意脚本注入生产页。

## 接入门槛

广告和支付代码已经以“空配置不启用”的方式随站点发布，但当前没有真实广告或支付入口。先跑 7–14 天真实访问，确认开始率、通关率和复玩率，再决定是否填入配置；接入前还要完成隐私说明、广告/支付政策、账号验证和收款资料回读。

## 用户接手清单

1. Paddle：完成注册、邮箱验证、账号审核与收款资料；批准 `chaoschemy.com` 后创建一次性支持商品和 Hosted Checkout。
2. AdSense：确认实际法定收款国家/地区后，再决定是否接受条款并提交；不要直接保留“美国”默认值。
3. Stripe：仅在未来具备受支持地区的合法实体、税号和银行资料时再考虑；当前不作为中国大陆主体路线。
4. 提交后回读账号状态、站点审核状态和支付资料状态；在这些状态可核验前，不在站点插入广告脚本或真实支付入口。

## 技术接手步骤

1. 在 Paddle 完成 `chaoschemy.com` 网站批准，创建 Live 客户端 Token，并生成一次性支持商品的 Hosted Checkout；将公开 URL 写入 `PADDLE_PAYMENT_LINK`，将客户端 Token 写入 `PADDLE_CLIENT_TOKEN`。
2. 在 AdSense 站点审核通过后，将 publisher ID 写入 `ADSENSE_CLIENT`、广告位 ID 写入 `ADSENSE_SLOT`。
3. 手动触发 Pages workflow，回读首页的支持入口、广告位、隐私页和浏览器事件；支付先用 Paddle sandbox 验证成功、取消和退款路径。
4. 若要暂停变现，清空 `PADDLE_PAYMENT_LINK`、`STRIPE_PAYMENT_LINK`、`ADSENSE_CLIENT` 和 `ADSENSE_SLOT` 并重新部署即可；空配置会自动隐藏入口。
