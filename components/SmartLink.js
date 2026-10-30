import Link from 'next/link'
import { siteConfig } from '@/lib/config'

// 过滤 <a> 标签不能识别的 props
const filterDOMProps = props => {
  const {
    passHref,
    legacyBehavior,
    placeholderSrc,
    fallbackSrc,
    ...rest
  } = props
  return rest
}

// 过滤不应该透传给 next/link 的非链接属性
const filterLinkProps = props => {
  const {
    placeholderSrc,
    fallbackSrc,
    src,
    alt,
    width,
    height,
    loading,
    decoding,
    onLoad,
    onError,
    ...rest
  } = props
  return rest
}

// 把 next/link 支持的对象形式 href 转成字符串（用于原生 <a>）
const hrefToString = h => {
  if (typeof h === 'string') {
    return h
  }
  if (h && typeof h === 'object') {
    const query = h.query
      ? '?' + new URLSearchParams(h.query).toString()
      : ''
    return `${h.pathname || ''}${query}${h.hash ? '#' + h.hash : ''}`
  }
  return ''
}

const SmartLink = ({ href, children, newTab, ...rest }) => {
  const LINK = siteConfig('LINK')

  // 获取 URL 字符串用于判断是否是外链
  let urlString = ''

  if (typeof href === 'string') {
    urlString = href
  } else if (
    typeof href === 'object' &&
    href !== null &&
    typeof href.pathname === 'string'
  ) {
    urlString = href.pathname
  }

  const isExternal = urlString.startsWith('http') && !urlString.startsWith(LINK)

  const getPersistedQuery = () => {
    if (typeof window === 'undefined') return {}
    const queryString = window.location.search?.slice(1) || ''
    const params = new URLSearchParams(queryString)
    const preserved = {}
    for (const [key, value] of params.entries()) {
      if (value !== '') preserved[key] = value
    }
    return preserved
  }

  const mergePreservedQueryForStringHref = value => {
    if (typeof value !== 'string' || !value || value.startsWith('#')) return value
    const preservedQuery = getPersistedQuery()
    if (Object.keys(preservedQuery).length === 0) return value

    const isAbsolute = value.startsWith('http://') || value.startsWith('https://')
    const url = new URL(value, LINK)
    Object.entries(preservedQuery).forEach(([key, paramValue]) => {
      if (!url.searchParams.has(key)) {
        url.searchParams.set(key, paramValue)
      }
    })

    if (isAbsolute) return url.toString()
    return `${url.pathname}${url.search}${url.hash}`
  }

  const mergePreservedQueryForObjectHref = value => {
    if (!value || typeof value !== 'object') return value
    const preservedQuery = getPersistedQuery()
    if (Object.keys(preservedQuery).length === 0) return value
    return {
      ...value,
      query: {
        ...preservedQuery,
        ...(value.query || {})
      }
    }
  }

  if (isExternal) {
    // 对于外部链接，必须是 string 类型
    const externalUrl =
      typeof href === 'string' ? href : new URL(href.pathname, LINK).toString()

    return (
      <a
        href={externalUrl}
        target='_blank'
        rel='noopener noreferrer'
        {...filterDOMProps(rest)}>
        {children}
      </a>
    )
  }

  // 站内【文章】链接：由调用方显式传 newTab 标记，按 LINK_POST_NEW_TAB 配置在新窗口打开。
  // 不用 URL 规则判断「是不是文章」：文章路由是 /[prefix]/[slug] 动态路由、
  // 前缀由 Notion 侧配置决定，靠路径匹配会误伤 /about 这类自定义页面。
  if (newTab && siteConfig('LINK_POST_NEW_TAB')) {
    // 新窗口打开不能用 next/link：Link 会拦截点击做客户端路由，
    // 与浏览器 target=_blank 的默认行为叠加会导致当前页也跟着跳转。
    // 改用原生 <a>，行为确定为「只开新标签，当前页不动」。
    return (
      <a
        href={
          typeof href === 'string'
            ? mergePreservedQueryForStringHref(href)
            : hrefToString(href)
        }
        rel='noopener noreferrer'
        {...filterDOMProps(rest)}
        target={rest.target || '_blank'}>
        {children}
      </a>
    )
  }

  // 内部链接（可为对象形式）
  const mergedHref =
    typeof href === 'string'
      ? mergePreservedQueryForStringHref(href)
      : mergePreservedQueryForObjectHref(href)

  return (
    <Link href={mergedHref} {...filterLinkProps(rest)}>
      {children}
    </Link>
  )
}

export default SmartLink
