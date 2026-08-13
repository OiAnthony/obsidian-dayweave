---
title: Journal frontend implementation excerpts
url: https://github.com/logseq/logseq
retrieved: 2026-08-12
---

## components/journal.cljs

(ns frontend.components.journal
  (:require [frontend.components.page :as page]
            [frontend.db.hooks :as db-hooks]
            [frontend.db.subs :as subs]
            [frontend.state :as state]
            [frontend.ui :as ui]
            [frontend.util :as util]
            [logseq.shui.hooks :as hooks]
            [io.factorhouse.hsx.core :as hsx]))

(defonce ^:private journal-item-height-by-key* (atom {}))

(def ^:private default-journal-height 640)

(defn- journal-ready?
  [journal-uuid]
  (= :ready (:status (subs/block-snapshot journal-uuid))))

(defn- journal-placeholder
  []
  [:div.journal-item-placeholder.animate-pulse.p-6
   {:aria-hidden true}
   [:div.h-8.w-48.rounded.bg-secondary]
   [:div.mt-8.h-5.w-full.rounded.bg-secondary]
   [:div.mt-3.h-5.rounded.bg-secondary {:class "w-2/3"}]])

(hsx/defc journal-content
  [journal-uuid]
  (or (page/journal-page journal-uuid {:journals? true})
      (journal-placeholder)))

(hsx/defc journal-item
  [journal-uuid last? render?]
  (let [repo (state/get-current-repo)
        cache-key [repo journal-uuid]
        *item-ref (hooks/use-ref nil)
        cached-height (get @journal-item-height-by-key* cache-key)]
    (hooks/use-effect!
     (fn []
       (when-let [node (and render? (hooks/deref *item-ref))]
         (let [observer
               (js/ResizeObserver.
                #(let [height (js/Math.round
                               (.-height (.getBoundingClientRect node)))]
                   (when (pos? height)
                     (swap! journal-item-height-by-key*
                            assoc cache-key height))))]
           (.observe observer node)
           #(.disconnect observer))))
     [repo journal-uuid render?])
    [:div.journal-item.content.relative
     (cond-> {:ref *item-ref}
       last? (assoc :class "journal-last-item")
       (or cached-height (not render?))
       (assoc :style {:min-height (or cached-height default-journal-height)}))
     (if render?
       (journal-content journal-uuid)
       (journal-placeholder))]))

(hsx/defc all-journals
  []
  (let [journal-uuids (vec (db-hooks/use-resource [:journals]))
        [scrolling? set-scrolling!] (hooks/use-state false)]
    (when (seq journal-uuids)
      (if (util/rtc-test-without-virtualization?)
        [:div#journals.h-full
         (map-indexed
          (fn [idx journal-uuid]
            ^{:key (str "journal-" journal-uuid)}
            [journal-item journal-uuid
             (= (inc idx) (count journal-uuids))
             true])
          journal-uuids)]
        [:div#journals.h-full
         (ui/virtualized-list
          {:custom-scroll-parent (util/app-scroll-container-node)
           :data (to-array journal-uuids)
           :compute-item-key (fn [_idx journal-uuid]
                               (str "journal-" journal-uuid))
           :is-scrolling set-scrolling!
           :item-content (fn [idx journal-uuid]
                           (journal-item journal-uuid
                                         (= (inc idx) (count journal-uuids))
                                         (or (journal-ready? journal-uuid)
                                             (not scrolling?))))})]))))

## handler/journal.cljs

(ns ^:no-doc frontend.handler.journal
  (:require [frontend.date :as date]
            [frontend.handler.route :as route-handler]
            [frontend.handler.page :as page-handler]
            [frontend.state :as state]
            [frontend.util :as util]
            [cljs-time.coerce :as tc]
            [cljs-time.core :as t]
            [promesa.core :as p]
            [frontend.db.async :as db-async]))

(defn- redirect-to-journal!
  [page]
  (when page
    (p/let [repo (state/get-current-repo)
            _ (db-async/<get-block repo page :children? false)
            exists? (db-async/<page-exists? repo page #{:logseq.class/Journal})]
     (if exists?
       (route-handler/redirect! {:to          :page
                                 :path-params {:name page}})
       (page-handler/<create! page)))))

(defn go-to-tomorrow!
  []
  (redirect-to-journal! (date/tomorrow)))

(defn- <get-current-journal
  []
  (let [current-page (state/get-current-page)]
    (p/let [block (when current-page
                    (db-async/<get-block (state/get-current-repo) current-page {:children? false}))]
      (or (some-> block :block/title date/journal-title->long)
          (util/time-ms)))))

(defn go-to-prev-journal!
  []
  (p/let [current-journal (<get-current-journal)
          day (tc/from-long current-journal)
          page (date/journal-name (t/minus day (t/days 1)))]
    (redirect-to-journal! page)))

(defn go-to-next-journal!
  []
  (p/let [current-journal (<get-current-journal)
          day (tc/from-long current-journal)
          page (date/journal-name (t/plus day (t/days 1)))]
    (redirect-to-journal! page)))

## frontend/date.cljs

(ns frontend.date
  "Journal date related utility fns"
  (:require ["chrono-node" :as chrono]
            [cljs-time.coerce :as tc]
            [cljs-time.core :as t]
            [cljs-time.format :as tf]
            [cljs-time.local :as tl]
            [clojure.string :as string]
            [frontend.context.i18n :as i18n]
            [frontend.state :as state]
            [goog.object :as gobj]
            [lambdaisland.glogi :as log]
            [logseq.common.date :as common-date]
            [logseq.common.util.date-time :as date-time-util]))

(def ^:private custom-formatter (tf/formatter "yyyy-MM-dd'T'HH:mm:ssZZ"))
(def ^:private custom-formatter-2 (tf/formatter "yyyy-MM-dd-HH-mm-ss"))
(def ^:private mmm-do-yyyy-formatter (tf/formatter "MMM do, yyyy"))
(def ^:private yyyy-MM-dd-HH-mm-formatter (tf/formatter "yyyy-MM-dd HH:mm"))
(def ^:private iso-parser (tf/formatter "yyyy-MM-dd'T'HH:mm:ss.SSSS'Z'"))

(defn nld-parse
  [s]
  (when (string? s)
    ((gobj/get chrono "parseDate") s)))

(defn journal-title-formatters
  []
  (common-date/journal-title-formatters (state/get-date-formatter)))

(defn get-date-time-string
  ([]
   (get-date-time-string (t/now)))
  ([date-time & {:keys [formatter-str]}]
   (tf/unparse (if formatter-str
                 (tf/formatter formatter-str)
                 custom-formatter) date-time)))

(defn get-date-time-string-2
  ([]
   (get-date-time-string-2 (tl/local-now)))
  ([date-time]
   (tf/unparse custom-formatter-2 date-time)))

(defn journal-name
  ([]
   (journal-name (tl/local-now)))
  ([date]
   (let [formatter (state/get-date-formatter)]
     (try
       (date-time-util/format date formatter)
       (catch :default e
         (log/error :parse-journal-date {:message  "Failed to parse date to journal name."
                                         :date date
                                         :format formatter})
         (throw e))))))

(defn start-of-day [date]
  (t/date-time (t/year date) (t/month date) (t/day date)))

(defn today
  []
  (journal-name))

(defn today-journal-day
  []
  (date-time-util/date->int (js/Date.)))

(defn today-name
  []
  (tf/unparse mmm-do-yyyy-formatter (t/today)))

(defn tomorrow
  []
  (journal-name (t/plus (start-of-day (tl/local-now)) (t/days 1))))

(defn yesterday
  []
  (journal-name (t/minus (start-of-day (tl/local-now)) (t/days 1))))

(defn get-current-time
  []
  (i18n/locale-format-time (js/Date.)))

(defn valid-journal-title?
  [title]
  (common-date/valid-journal-title? title (state/get-date-formatter)))

(defn journal-title->
  ([journal-title then-fn]
   (journal-title-> journal-title then-fn (date-time-util/safe-journal-title-formatters (state/get-date-formatter))))
  ([journal-title then-fn formatters]
   (date-time-util/journal-title-> journal-title then-fn formatters)))

(defn journal-title->int
  [journal-title]
  (date-time-util/journal-title->int
   journal-title
   (date-time-util/safe-journal-title-formatters (state/get-date-formatter))))

(def journal-day->utc-ms date-time-util/journal-day->ms)

(defn journal-title->long
  [journal-title]
  (journal-title-> journal-title #(tc/to-long %)))

(defn int->local-time-2
  [n]
  (tf/unparse
   yyyy-MM-dd-HH-mm-formatter
   (t/to-default-time-zone (tc/from-long n))))

(defn parse-iso [string]
  (tf/parse iso-parser string))

(defn js-date->journal-title
  [date]
  (journal-name (t/to-default-time-zone date)))

(defn js-date->goog-date
  [d]
  (cond
    (some->> d (instance? js/Date))
    (goog.date.Date. (.getFullYear d) (.getMonth d) (.getDate d))
    :else d))

(def nlp-pages
  ["Today"
   "Tomorrow"
   "Yesterday"
   "Next week"
   "This week"
   "Last week"
   "Next month"
   "This month"
   "Last month"
   "Next year"
   "This year"
   "Last year"
   "Last Monday"
   "Last Tuesday"
   "Last Wednesday"
   "Last Thursday"
   "Last Friday"
   "Last Saturday"
   "Last Sunday"
   "This Monday"
   "This Tuesday"
   "This Wednesday"
   "This Thursday"
   "This Friday"
   "This Saturday"
   "This Sunday"
   "Next Monday"
   "Next Tuesday"
   "Next Wednesday"
   "Next Thursday"
   "Next Friday"
   "Next Saturday"
   "Next Sunday"])

(defn- nlp-page->i18n-key
  "Derives a :date.nlp/* i18n key from an English NLP page string.
  Example: \"Last Monday\" -> :date.nlp/last-monday"
  [s]
  (keyword "date.nlp" (-> s string/lower-case (string/replace " " "-"))))

(defn- with-i18n-titles
  "Wraps a collection of English display strings, returning a seq of maps with
  {:block/title <translated-label> :nlp-original-title <english-string>
   ...extra}.
  key-fn derives an i18n keyword from each English string.
  t-fn is the translation function (frontend.context.i18n/t)."
  [items key-fn t-fn extra]
  (map (fn [en]
         (merge extra
                {:block/title (t-fn (key-fn en))
                 :nlp-original-title en}))
       items))

(defn nlp-pages-i18n
  "Returns nlp-pages as a seq of maps with translated :block/title labels.
  :nlp-original-title preserves the English string for chrono-node NLP parsing.
  Accepts optional keyword args merged into every output map."
  [& {:as extra}]
  (with-i18n-titles nlp-pages nlp-page->i18n-key i18n/t extra))

(comment
  (def default-formatter (tf/formatter "MMM do, yyyy"))
  (def zh-formatter (tf/formatter "YYYY年MM月dd日"))

  (tf/show-formatters)

  ;; :date 2020-05-31
  ;; :rfc822 Sun, 31 May 2020 03:00:57 Z

  (let [info {:ExpireTime 1680781356,
              :UserGroups [],
              :LemonRenewsAt "2024-04-11T07:28:00.000000Z",
              :LemonEndsAt nil,
              :LemonStatus "active"}]
    (->> info :LemonRenewsAt (tf/parse iso-parser) (< (js/Date.)))))
