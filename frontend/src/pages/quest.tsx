import { useState, useEffect, useCallback } from "react"
import {
  ArrowLeft,
  Plus,
  Users,
  Target,
  Coins,
  CheckCircle2,
  Circle,
  UserPlus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useInView, useCountUp } from "@/hooks/use-animations"
import { useWallet } from "@/hooks/use-wallet"
import { formatTokens } from "@/lib/utils"
import { questClient } from "@/lib/contracts/quest"
import type { QuestInfo } from "@/lib/contracts/quest"
import { milestoneClient } from "@/lib/contracts/milestone"
import type { MilestoneInfo } from "@/lib/contracts/milestone"
import { rewardsClient } from "@/lib/contracts/rewards"

interface QuestViewProps {
  questId: number
  onBack: () => void
}

type Tab = "milestones" | "enrollees"

export function QuestView({ questId, onBack }: QuestViewProps) {
  const { address } = useWallet()
  const [activeTab, setActiveTab] = useState<Tab>("milestones")
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quest, setQuest] = useState<QuestInfo | null>(null)
  const [milestones, setMilestones] = useState<MilestoneInfo[]>([])
  const [enrollees, setEnrollees] = useState<string[]>([])
  const [completions, setCompletions] = useState<number>(0)
  const [poolBalance, setPoolBalance] = useState<bigint>(0n)
  
  const [statsRef, statsInView] = useInView()
  const [contentRef, contentInView] = useInView()

  const fetchQuestDetails = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = await questClient.getQuest(questId)
      if (!q) {
        setError("Quest not found.")
        setLoading(false)
        return
      }
      setQuest(q)

      const [ms, enrs, balance] = await Promise.all([
        milestoneClient.getMilestones(questId),
        questClient.getEnrollees(questId),
        rewardsClient.getPoolBalance(questId),
      ])

      setMilestones(ms)
      setEnrollees(enrs)
      setPoolBalance(balance)

      if (address) {
        const completedCount = await milestoneClient.getEnrolleeCompletions(questId, address)
        setCompletions(completedCount)
      }
    } catch (err) {
      console.error("Failed to fetch quest details:", err)
      setError("Failed to load quest details from the network.")
    } finally {
      setLoading(false)
    }
  }, [questId, address])

  useEffect(() => {
    fetchQuestDetails()
  }, [fetchQuestDetails])

  const totalReward = milestones.reduce((sum, m) => sum + m.rewardAmount, 0n)
  const isComplete = completions === milestones.length && milestones.length > 0
  
  // Estimation of earned rewards (simplified: assuming completion counts milestones from the beginning)
  const earnedReward = completions > 0 ? (totalReward * BigInt(completions)) / BigInt(milestones.length || 1) : 0n

  const animEnrollees = useCountUp(enrollees.length, 400, statsInView)
  const animMilestones = useCountUp(milestones.length, 400, statsInView)
  const animPoolBalance = useCountUp(Number(poolBalance), 800, statsInView)
  const animTotalReward = useCountUp(Number(totalReward), 800, statsInView)

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 text-center flex flex-col items-center">
        <Loader2 className="h-10 w-10 animate-spin mb-4" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Fetching quest data...</p>
      </div>
    )
  }

  if (error || !quest) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 text-center">
        <div className="w-16 h-16 bg-destructive/10 border-[3px] border-black flex items-center justify-center mb-6 mx-auto">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-2xl font-black mb-4">{error || "Quest not found"}</h2>
        <Button variant="outline" onClick={onBack} className="border-black">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go back to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8">
      {/* Background */}
      <div className="absolute inset-0 bg-grid-dots pointer-events-none opacity-30" />

      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground mb-6 transition-colors cursor-pointer group"
      >
        <div className="w-7 h-7 border-[2px] border-black bg-white shadow-[2px_2px_0_#000] flex items-center justify-center neo-press hover:shadow-[3px_3px_0_#000] active:shadow-[1px_1px_0_#000] group-hover:bg-primary transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
        </div>
        Back to Dashboard
      </button>

      {/* Quest header card */}
      <div className="relative bg-white border-[3px] border-black shadow-[6px_6px_0_#000] overflow-hidden mb-8 animate-fade-in-up">
        {/* Header bar */}
        <div className="bg-primary border-b-[3px] border-black px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-wider">
              Quest Details
            </span>
            {isComplete && (
              <Badge variant="success" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Complete
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-success border border-black" />
            <span className="text-xs font-bold">Live</span>
          </div>
        </div>

        <div className="p-6 relative">
          <div className="absolute inset-0 bg-diagonal-lines pointer-events-none opacity-20" />
          <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black">{quest.name}</h1>
              <p className="text-muted-foreground text-sm mt-1 max-w-xl">
                {quest.description}
              </p>
            </div>
            {quest.owner === address && (
              <div className="flex gap-3 flex-shrink-0">
                <Button variant="outline" size="sm" className="shimmer-on-hover border-black">
                  <UserPlus className="h-4 w-4" />
                  Add Enrollee
                </Button>
                <Button size="sm" className="shimmer-on-hover">
                  <Plus className="h-4 w-4" />
                  Add Milestone
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div ref={statsRef} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          {
            icon: Users,
            label: "Enrollees",
            value: animEnrollees,
            bg: "bg-primary",
          },
          {
            icon: Target,
            label: "Milestones",
            value: animMilestones,
            bg: "bg-primary",
          },
          {
            icon: Coins,
            label: "Pool Balance",
            value: formatTokens(animPoolBalance),
            bg: "bg-primary",
          },
          {
            icon: Coins,
            label: "Total Rewards",
            value: formatTokens(animTotalReward),
            bg: "bg-success",
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`reveal-up ${statsInView ? "in-view" : ""}`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <Card className="neo-lift hover:shadow-[7px_7px_0_#000] active:shadow-[2px_2px_0_#000] border-black border-2">
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className={`w-10 h-10 ${stat.bg} border-[2px] border-black shadow-[2px_2px_0_#000] flex items-center justify-center flex-shrink-0`}
                >
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-lg font-black tabular-nums">
                    {stat.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Progress section (only for enrollees) */}
      {milestones.length > 0 && address && enrollees.includes(address) && (
        <div className="mb-8 animate-fade-in-up stagger-3">
          <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_#000] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-black">Your Progress</span>
              <div className="flex items-center gap-3">
                {earnedReward > 0n && (
                  <span className="text-xs font-bold text-green-700">
                    +{formatTokens(Number(earnedReward))} USDC earned
                  </span>
                )}
                <span className="text-sm font-black">
                  {completions}/{milestones.length}
                </span>
              </div>
            </div>
            <Progress value={completions} max={milestones.length} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b-[3px] border-black mb-6" ref={contentRef}>
        {(["milestones", "enrollees"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-black uppercase tracking-wider border-[3px] border-b-0 transition-all capitalize cursor-pointer -mb-[3px] ${
              activeTab === tab
                ? "border-black bg-primary shadow-[2px_-2px_0_#000]"
                : "border-transparent hover:bg-secondary"
            }`}
          >
            {tab}
            <span className="ml-2 text-xs opacity-60">
              ({tab === "milestones" ? milestones.length : enrollees.length})
            </span>
          </button>
        ))}
      </div>

      {/* Milestones tab */}
      {activeTab === "milestones" && (
        <div className="space-y-4">
          {milestones.length === 0 ? (
            <Card className="animate-fade-in-up border-black border-2">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="w-14 h-14 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center mb-4">
                  <Target className="h-6 w-6" />
                </div>
                <h3 className="font-black mb-2">No milestones yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Define learning goals for this quest.
                </p>
                {quest.owner === address && (
                  <Button size="sm" className="shimmer-on-hover">
                    <Plus className="h-4 w-4" />
                    Add Milestone
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            milestones.map((ms, i) => {
              const milestoneId = i // Using index as ID if not provided in struct
              const done = completions > i
              const isExpanded = expandedMilestone === milestoneId

              return (
                <div
                  key={milestoneId}
                  className={`reveal-up ${contentInView ? "in-view" : ""}`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <Card
                    className={`neo-lift hover:shadow-[7px_7px_0_#000] active:shadow-[2px_2px_0_#000] cursor-pointer group transition-all border-black border-2 ${
                      done ? "border-success" : ""
                    }`}
                    onClick={() =>
                      setExpandedMilestone(isExpanded ? null : milestoneId)
                    }
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-8 h-8 border-[2px] border-black shadow-[2px_2px_0_#000] flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300 ${
                            done ? "bg-success" : "bg-white group-hover:bg-secondary"
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <h3
                              className={`font-black ${done ? "text-muted-foreground" : ""}`}
                            >
                              {ms.title}
                            </h3>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge
                                variant={done ? "success" : "default"}
                                className={done ? "" : "bg-primary text-black border-black"}
                              >
                                {formatTokens(Number(ms.rewardAmount))} USDC
                              </Badge>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* Expanded content */}
                          {isExpanded && (
                            <div className="mt-3 animate-fade-in-up">
                              <p className="text-sm text-muted-foreground mb-4">
                                {ms.description}
                              </p>
                              
                              {quest.owner === address && !done && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="shimmer-on-hover border-black"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Verification logic would go here
                                  }}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                                  Verify Completion
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Enrollees tab */}
      {activeTab === "enrollees" && (
        <div className="space-y-4">
          {enrollees.length === 0 ? (
            <Card className="animate-fade-in-up border-black border-2">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="w-14 h-14 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center mb-4">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="font-black mb-2">No enrollees yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Invite learners to this quest.
                </p>
                {quest.owner === address && (
                  <Button size="sm" className="shimmer-on-hover border-black">
                    <UserPlus className="h-4 w-4" />
                    Add Enrollee
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            enrollees.map((addr, i) => (
              <div
                key={addr}
                className={`reveal-up ${contentInView ? "in-view" : ""}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <Card className="neo-lift hover:shadow-[7px_7px_0_#000] active:shadow-[2px_2px_0_#000] group border-black border-2">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary border-[2px] border-black shadow-[2px_2px_0_#000] flex items-center justify-center text-sm font-mono font-black group-hover:shadow-[3px_3px_0_#000] transition-shadow">
                          {addr.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-mono text-xs font-bold break-all max-w-[150px] sm:max-w-none">
                            {addr}
                          </p>
                          <Badge variant="secondary" className="mt-1 text-[10px]">Learner</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                         <div className="w-8 h-8 bg-secondary border-[2px] border-black flex items-center justify-center group-hover:bg-primary transition-colors cursor-pointer ml-auto">
                            <ArrowLeft className="h-4 w-4 rotate-180" />
                         </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
