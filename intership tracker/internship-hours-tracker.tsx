'use client'

import { useState, useEffect, useRef } from 'react'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Trash2, Plus, X } from 'lucide-react'

type HourType = string
type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'

interface DailyHours {
  [key: string]: number
}

interface WeekData {
  id: string
  name: string
  days: {
    [K in DayOfWeek]: DailyHours
  }
}

const initialDailyHours: DailyHours = {
  individual: 0,
  intake: 0,
  group: 0,
  consultation: 0,
  documentation: 0,
  supervision: 0,
}

const daysOfWeek: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const createEmptyWeek = (id: string, name: string): WeekData => ({
  id,
  name,
  days: daysOfWeek.reduce((acc, day) => ({
    ...acc,
    [day]: { ...initialDailyHours }
  }), {} as WeekData['days'])
})

export default function InternshipHoursTracker() {
  const [weeks, setWeeks] = useState<WeekData[]>([])
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('monday')
  const [weekToDelete, setWeekToDelete] = useState<string | null>(null)
  const [directHourTypes, setDirectHourTypes] = useState<HourType[]>(['individual', 'intake', 'group'])
  const [indirectHourTypes, setIndirectHourTypes] = useState<HourType[]>(['consultation', 'documentation', 'supervision'])
  const [newHourType, setNewHourType] = useState('')
  const [newHourTypeCategory, setNewHourTypeCategory] = useState<'direct' | 'indirect'>('direct')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const storedWeeks = localStorage.getItem('internshipWeeks')
    if (storedWeeks) {
      try {
        const parsedWeeks = JSON.parse(storedWeeks)
        setWeeks(parsedWeeks)
        setSelectedWeekId(parsedWeeks[parsedWeeks.length - 1]?.id || null)
      } catch (error) {
        console.error('Error parsing stored weeks:', error)
        createNewWeek()
      }
    } else {
      createNewWeek()
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('internshipWeeks', JSON.stringify(weeks))
  }, [weeks])

  const createNewWeek = () => {
    const newWeek = createEmptyWeek(Date.now().toString(), `Week ${weeks.length + 1}`)
    setWeeks(prev => [...prev, newWeek])
    setSelectedWeekId(newWeek.id)
  }

  const handleInputChange = (day: DayOfWeek, type: HourType, value: string) => {
    setWeeks(prev => prev.map(week => 
      week.id === selectedWeekId 
        ? { 
            ...week, 
            days: {
              ...week.days,
              [day]: { ...week.days[day], [type]: parseFloat(value) || 0 }
            }
          }
        : week
    ))
  }

  const calculateTotal = (hours: DailyHours, types: HourType[]) => 
    types.reduce((sum, type) => sum + (hours[type] || 0), 0)

  const calculateWeeklyTotal = (week: WeekData, types: HourType[]) => 
    Object.values(week.days).reduce((sum, day) => sum + calculateTotal(day, types), 0)

  const calculateOverallTotals = (types: HourType[]) => 
    weeks.reduce((totals, week) => {
      Object.values(week.days).forEach(day => {
        types.forEach(type => {
          totals[type] = (totals[type] || 0) + (day[type] || 0)
        })
      })
      return totals
    }, {} as DailyHours)

  const exportData = () => {
    const dataStr = JSON.stringify(weeks, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = 'internship_hours_data.json'

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string)
          setWeeks(importedData)
          setSelectedWeekId(importedData[importedData.length - 1]?.id || null)
        } catch (error) {
          console.error('Error importing data:', error)
          alert('Invalid data file')
        }
      }
      reader.readAsText(file)
    }
  }

  const clearAllHours = () => {
    setWeeks(prev => prev.map(week => 
      week.id === selectedWeekId
        ? {
            ...week,
            days: Object.fromEntries(
              Object.entries(week.days).map(([day, _]) => [day, { ...initialDailyHours }])
            ) as WeekData['days']
          }
        : week
    ))
  }

  const deleteWeek = () => {
    if (weekToDelete) {
      setWeeks(prev => prev.filter(week => week.id !== weekToDelete))
      if (selectedWeekId === weekToDelete) {
        const remainingWeeks = weeks.filter(week => week.id !== weekToDelete)
        setSelectedWeekId(remainingWeeks[remainingWeeks.length - 1]?.id || null)
      }
      setWeekToDelete(null)
    }
  }

  const addNewHourType = () => {
    if (newHourType && !directHourTypes.includes(newHourType) && !indirectHourTypes.includes(newHourType)) {
      if (newHourTypeCategory === 'direct') {
        setDirectHourTypes(prev => [...prev, newHourType])
      } else {
        setIndirectHourTypes(prev => [...prev, newHourType])
      }
      setWeeks(prev => prev.map(week => ({
        ...week,
        days: Object.fromEntries(
          Object.entries(week.days).map(([day, hours]) => [day, { ...hours, [newHourType]: 0 }])
        )
      })))
      setNewHourType('')
    }
  }

  const deleteHourType = (type: HourType, category: 'direct' | 'indirect') => {
    if (category === 'direct') {
      setDirectHourTypes(prev => prev.filter(t => t !== type))
    } else {
      setIndirectHourTypes(prev => prev.filter(t => t !== type))
    }
    setWeeks(prev => prev.map(week => ({
      ...week,
      days: Object.fromEntries(
        Object.entries(week.days).map(([day, hours]) => {
          const { [type]: _, ...rest } = hours
          return [day, rest]
        })
      )
    })))
  }

  const selectedWeek = weeks.find(week => week.id === selectedWeekId) || null
  const overallDirectTotals = calculateOverallTotals(directHourTypes)
  const overallIndirectTotals = calculateOverallTotals(indirectHourTypes)

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Internship Hours Tracker</h1>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Select value={selectedWeekId || ''} onValueChange={setSelectedWeekId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a week" />
            </SelectTrigger>
            <SelectContent>
              {weeks.map(week => (
                <SelectItem key={week.id} value={week.id}>
                  {week.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekToDelete(selectedWeekId)}
                disabled={!selectedWeekId}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete week</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete this week?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the week and all its data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setWeekToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteWeek}>Delete Week</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="space-x-2">
          <Button onClick={createNewWeek}>Add New Week</Button>
          <Button onClick={exportData}>Export Data</Button>
          <Button onClick={() => fileInputRef.current?.click()}>Import Data</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={!selectedWeekId}>Clear All Hours</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all hours for the selected week.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearAllHours}>Clear All Hours</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Hour Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Hour Type</DialogTitle>
                <DialogDescription>
                  Enter a name for the new hour type and select its category.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newHourType}
                    onChange={(e) => setNewHourType(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    Category
                  </Label>
                  <RadioGroup
                    defaultValue="direct"
                    onValueChange={(value) => setNewHourTypeCategory(value as 'direct' | 'indirect')}
                    className="col-span-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="direct" id="direct" />
                      <Label htmlFor="direct">Direct Hours</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="indirect" id="indirect" />
                      <Label htmlFor="indirect">Indirect Hours</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addNewHourType}>Add Hour Type</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <input
            type="file"
            ref={fileInputRef}
            onChange={importData}
            accept=".json"
            style={{ display: 'none' }}
          />
        </div>
      </div>
      {selectedWeek && (
        <>
          <Tabs value={selectedDay} onValueChange={(value) => setSelectedDay(value as DayOfWeek)}>
            <TabsList>
              {daysOfWeek.map(day => (
                <TabsTrigger key={day} value={day} className="capitalize">
                  {day}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Table>
            <TableCaption>Internship hours for {selectedWeek.name} - {selectedDay}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Hour Type</TableHead>
                <TableHead>Daily Hours</TableHead>
                <TableHead>Weekly Total</TableHead>
                <TableHead>Overall Total</TableHead>
                <TableHead className="w-[100px]">Actions</Table
Head>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="font-bold">Direct Hours</TableCell>
              </TableRow>
              {directHourTypes.map((type) => (
                <TableRow key={type}>
                  <TableCell className="capitalize">{type} Counseling</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={selectedWeek.days[selectedDay][type] || ''}
                      onChange={(e) => handleInputChange(selectedDay, type, e.target.value)}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    {Object.values(selectedWeek.days).reduce((sum, day) => sum + (day[type] || 0), 0)}
                  </TableCell>
                  <TableCell>{overallDirectTotals[type] || 0}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteHourType(type, 'direct')}
                      disabled={directHourTypes.length <= 1}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Delete hour type</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-bold">Direct Hours Subtotal</TableCell>
                <TableCell>{calculateTotal(selectedWeek.days[selectedDay], directHourTypes)}</TableCell>
                <TableCell>{calculateWeeklyTotal(selectedWeek, directHourTypes)}</TableCell>
                <TableCell>{calculateTotal(overallDirectTotals, directHourTypes)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={5} className="font-bold">Indirect Hours</TableCell>
              </TableRow>
              {indirectHourTypes.map((type) => (
                <TableRow key={type}>
                  <TableCell className="capitalize">{type}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={selectedWeek.days[selectedDay][type] || ''}
                      onChange={(e) => handleInputChange(selectedDay, type, e.target.value)}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    {Object.values(selectedWeek.days).reduce((sum, day) => sum + (day[type] || 0), 0)}
                  </TableCell>
                  <TableCell>{overallIndirectTotals[type] || 0}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteHourType(type, 'indirect')}
                      disabled={indirectHourTypes.length <= 1}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Delete hour type</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-bold">Indirect Hours Subtotal</TableCell>
                <TableCell>{calculateTotal(selectedWeek.days[selectedDay], indirectHourTypes)}</TableCell>
                <TableCell>{calculateWeeklyTotal(selectedWeek, indirectHourTypes)}</TableCell>
                <TableCell>{calculateTotal(overallIndirectTotals, indirectHourTypes)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-bold">Total Hours</TableCell>
                <TableCell>
                  {calculateTotal(selectedWeek.days[selectedDay], [...directHourTypes, ...indirectHourTypes])}
                </TableCell>
                <TableCell>
                  {calculateWeeklyTotal(selectedWeek, [...directHourTypes, ...indirectHourTypes])}
                </TableCell>
                <TableCell>
                  {calculateTotal({...overallDirectTotals, ...overallIndirectTotals}, [...directHourTypes, ...indirectHourTypes])}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </>
      )}
    </div>
  )
}