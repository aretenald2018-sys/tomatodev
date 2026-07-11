package com.lifestreak.wear.workout

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.lifestreak.wear.R
import java.util.Locale

class WearRunMetricPagerAdapter : RecyclerView.Adapter<WearRunMetricPagerAdapter.PageViewHolder>() {
    private var snapshot: WearRunUiSnapshot? = null
    private var gpsStatus: String = "GPS 대기"

    fun submitSnapshot(nextSnapshot: WearRunUiSnapshot, nextGpsStatus: String) {
        snapshot = nextSnapshot
        gpsStatus = nextGpsStatus
        notifyItemRangeChanged(0, PAGE_COUNT)
    }

    override fun getItemCount(): Int = PAGE_COUNT

    override fun getItemViewType(position: Int): Int = PAGE_LAYOUTS[position]

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PageViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(viewType, parent, false)
        return PageViewHolder(view)
    }

    override fun onBindViewHolder(holder: PageViewHolder, position: Int) {
        holder.bind(position, snapshot, gpsStatus)
    }

    class PageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        fun bind(position: Int, snapshot: WearRunUiSnapshot?, gpsStatus: String) {
            if (snapshot == null) return
            when (position) {
                PAGE_SUMMARY -> bindSummary(snapshot)
                PAGE_PACE -> bindPace(snapshot)
                PAGE_HEART -> bindHeart(snapshot)
                PAGE_HEART_ZONES -> bindHeartZones(snapshot)
                PAGE_ROUTE -> bindRoute(snapshot, gpsStatus)
            }
        }

        private fun bindSummary(snapshot: WearRunUiSnapshot) {
            itemView.findViewById<TextView>(R.id.runSummaryPageDistance)?.text = snapshot.distanceSummaryText
            itemView.findViewById<TextView>(R.id.runSummaryPageDuration)?.text = snapshot.durationText
            itemView.findViewById<TextView>(R.id.runSummaryPagePace)?.text = snapshot.averagePaceText.asPaceLabel()
            itemView.findViewById<TextView>(R.id.runSummaryPageCalories)?.text = snapshot.calorieText
        }

        private fun bindPace(snapshot: WearRunUiSnapshot) {
            itemView.findViewById<TextView>(R.id.runPaceAverage)?.text = snapshot.averagePaceText
            itemView.findViewById<TextView>(R.id.runPaceFastest)?.text = snapshot.fastestPaceText
            itemView.findViewById<WearRunPaceGraphView>(R.id.runPaceGraph)
                ?.setTrend(snapshot.paceTrend)
        }

        private fun bindHeart(snapshot: WearRunUiSnapshot) {
            itemView.findViewById<TextView>(R.id.runHeartAverage)?.text =
                snapshot.averageHeartRateBpm?.let { "$it bpm" } ?: snapshot.heartRateText
            itemView.findViewById<TextView>(R.id.runHeartMax)?.text =
                snapshot.maxHeartRateBpm?.let { "$it bpm" } ?: "-- bpm"
            itemView.findViewById<WearRunHeartGraphView>(R.id.runHeartGraph)
                ?.setTrend(snapshot.heartRateTrend)
        }

        private fun bindHeartZones(snapshot: WearRunUiSnapshot) {
            itemView.findViewById<WearRunHeartZonesView>(R.id.runHeartZonesGraph)
                ?.setZoneRows(snapshot.heartZoneRows)
        }

        private fun bindRoute(snapshot: WearRunUiSnapshot, gpsStatus: String) {
            itemView.findViewById<WearRunLiveRouteMapView>(R.id.runRouteMap)
                ?.setRouteProjection(snapshot.routeProjection)
            itemView.findViewById<TextView>(R.id.runRouteStatus)?.text = routeStatus(snapshot.routeProjection, gpsStatus)
            itemView.findViewById<TextView>(R.id.runRouteCoordinate)?.text = snapshot.routeProjection.currentLocation
                ?.let { point -> String.format(Locale.US, "현재 %.5f, %.5f", point.lat, point.lng) }
                ?: "GPS 위치 수신 대기"
        }

        private fun routeStatus(routeProjection: WearRouteProjection, gpsStatus: String): String {
            return if (routeProjection.isReady) {
                "경로 ${routeProjection.points.size}점"
            } else if (routeProjection.hasCurrentLocation) {
                "현재 위치 수신 · 경로 대기"
            } else {
                gpsStatus
            }
        }
    }

    companion object {
        const val PAGE_COUNT = 5
        private const val PAGE_SUMMARY = 0
        private const val PAGE_PACE = 1
        private const val PAGE_HEART = 2
        private const val PAGE_HEART_ZONES = 3
        private const val PAGE_ROUTE = 4

        private val PAGE_LAYOUTS = intArrayOf(
            R.layout.wear_run_page_summary,
            R.layout.wear_run_page_pace,
            R.layout.wear_run_page_heart,
            R.layout.wear_run_page_heart_zones,
            R.layout.wear_run_page_route,
        )
    }
}

private fun String.asPaceLabel(): String {
    return if (this == "--") "-- /km" else "$this /km"
}
